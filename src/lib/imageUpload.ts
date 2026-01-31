import { supabase } from './supabase'
import { moderateImage } from './moderation'

const ALLOWED_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
])

const ALLOWED_EXTENSIONS = new Set([
  'jpg', 'jpeg', 'png', 'webp', 'heic', 'heif',
])

const THUMBNAIL_SIZE = 400
const THUMBNAIL_QUALITY = 0.82

const IMAGE_ACCEPT = '.jpg,.jpeg,.png,.heic,.heif,.webp'
export { IMAGE_ACCEPT }

/** 업로드 결과: 원본 URL + 썸네일 URL */
export interface UploadResult {
  url: string
  thumbnailUrl: string
}

function getExtension(name: string): string {
  return name.split('.').pop()?.toLowerCase() ?? ''
}

function isAllowedFormat(file: File): boolean {
  if (ALLOWED_TYPES.has(file.type)) return true
  // HEIC 등 일부 기기에서 mime type이 비어 있을 수 있으므로 확장자도 체크
  return ALLOWED_EXTENSIONS.has(getExtension(file.name))
}

function isHeic(file: File): boolean {
  const ext = getExtension(file.name)
  return (
    file.type === 'image/heic' ||
    file.type === 'image/heif' ||
    ext === 'heic' ||
    ext === 'heif'
  )
}

/** HEIC/HEIF → JPEG Blob 변환 (고품질) */
async function convertHeic(file: File): Promise<Blob> {
  const heic2any = (await import('heic2any')).default
  const result = await heic2any({
    blob: file,
    toType: 'image/jpeg',
    quality: 0.98, // 최대한 무손실에 가깝게
  })
  return Array.isArray(result) ? result[0] : result
}

/**
 * Canvas를 이용해 이미지를 WebP로 변환 (썸네일 생성용)
 * - maxDim: 최대 크기
 * - quality: WebP 품질
 * - crop: true면 중앙 크롭하여 정사각형으로 만듦
 */
function toWebP(
  source: Blob,
  maxDim: number,
  quality: number,
  crop: boolean = false,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(source)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)

      let sx = 0, sy = 0, sw = img.width, sh = img.height
      let width: number, height: number

      if (crop) {
        // 중앙 크롭 (정사각형)
        const side = Math.min(img.width, img.height)
        sx = Math.round((img.width - side) / 2)
        sy = Math.round((img.height - side) / 2)
        sw = side
        sh = side
        width = maxDim
        height = maxDim
      } else if (maxDim > 0 && (img.width > maxDim || img.height > maxDim)) {
        // 리사이즈 필요 시에만 리사이즈
        const ratio = Math.min(maxDim / img.width, maxDim / img.height)
        width = Math.round(img.width * ratio)
        height = Math.round(img.height * ratio)
      } else {
        // 원본 해상도 유지
        width = img.width
        height = img.height
      }

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) return reject(new Error('Canvas not supported'))

      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, width, height)
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob)
          else reject(new Error('WebP 변환 실패'))
        },
        'image/webp',
        quality,
      )
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('이미지 로드 실패'))
    }
    img.src = url
  })
}

/**
 * Supabase Storage images 버킷에 업로드 후 공개 URL 반환
 * - 지원 형식: JPEG, PNG, HEIC/HEIF, WEBP
 * - 원본 그대로 업로드 (변환 없음)
 * @deprecated uploadImageWithThumbnail 사용 권장
 */
export async function uploadImage(file: File): Promise<string> {
  const result = await uploadImageWithThumbnail(file)
  return result.url
}

/**
 * 이미지 + 썸네일(400x400)을 함께 업로드
 * - 원본: 변환 없이 그대로 업로드 (JPEG/PNG/WebP 원본 유지)
 * - HEIC만 JPEG로 변환 (브라우저 호환성)
 * - 썸네일: 400x400px 중앙 크롭, WebP 82% 품질
 */
export async function uploadImageWithThumbnail(file: File): Promise<UploadResult> {
  // 1. 형식 검증
  if (!isAllowedFormat(file)) {
    throw new Error(
      '지원하지 않는 형식입니다. JPEG, PNG, HEIC, WEBP 파일만 업로드 가능합니다.',
    )
  }

  // 2. 이미지 검열
  const modResult = await moderateImage(file)
  if (modResult.blocked) {
    throw new Error(
      modResult.message ?? '커뮤니티 가이드라인에 맞지 않는 이미지입니다.',
    )
  }

  // 3. 원본 처리: HEIC만 JPEG로 변환, 나머지는 그대로
  let originalBlob: Blob = file
  let originalExt = getExtension(file.name) || 'jpg'
  let originalContentType = file.type || 'image/jpeg'

  if (isHeic(file)) {
    originalBlob = await convertHeic(file)
    originalExt = 'jpg'
    originalContentType = 'image/jpeg'
  }

  // 4. 썸네일 생성 (400x400 중앙 크롭, WebP)
  const thumbBlob = await toWebP(originalBlob, THUMBNAIL_SIZE, THUMBNAIL_QUALITY, true)

  // 5. 병렬 업로드 (원본 + 썸네일)
  const uuid = crypto.randomUUID()
  const originalPath = `${uuid}.${originalExt}`
  const thumbPath = `thumb/${uuid}.webp`

  const [origResult, thumbResult] = await Promise.all([
    supabase.storage
      .from('images')
      .upload(originalPath, originalBlob, {
        contentType: originalContentType,
        cacheControl: '31536000',
      }),
    supabase.storage
      .from('images')
      .upload(thumbPath, thumbBlob, {
        contentType: 'image/webp',
        cacheControl: '31536000',
      }),
  ])

  if (origResult.error) throw origResult.error
  if (thumbResult.error) throw thumbResult.error

  const { data: origData } = supabase.storage.from('images').getPublicUrl(originalPath)
  const { data: thumbData } = supabase.storage.from('images').getPublicUrl(thumbPath)

  return {
    url: origData.publicUrl,
    thumbnailUrl: thumbData.publicUrl,
  }
}
