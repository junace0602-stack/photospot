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

const MAX_DIMENSION = 1920
const THUMBNAIL_SIZE = 100
const WEBP_QUALITY = 0.85
const THUMBNAIL_QUALITY = 0.8

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

/** HEIC/HEIF → JPEG Blob 변환 */
async function convertHeic(file: File): Promise<Blob> {
  const heic2any = (await import('heic2any')).default
  const result = await heic2any({
    blob: file,
    toType: 'image/jpeg',
    quality: 0.92,
  })
  return Array.isArray(result) ? result[0] : result
}

/**
 * Canvas를 이용해 이미지를 WebP로 변환 + 리사이즈 + 압축
 * - maxDim: 최대 크기 (기본 1920px, 비율 유지)
 * - quality: WebP 품질 (기본 0.85)
 * - crop: true면 중앙 크롭하여 정사각형으로 만듦 (썸네일용)
 */
function toWebP(
  source: Blob,
  maxDim = MAX_DIMENSION,
  quality = WEBP_QUALITY,
  crop = false,
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
      } else {
        width = img.width
        height = img.height
        if (width > maxDim || height > maxDim) {
          const ratio = Math.min(maxDim / width, maxDim / height)
          width = Math.round(width * ratio)
          height = Math.round(height * ratio)
        }
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
 * - 모든 이미지를 WebP로 변환 (85% 품질, 최대 1920px)
 * @deprecated uploadImageWithThumbnail 사용 권장
 */
export async function uploadImage(file: File): Promise<string> {
  const result = await uploadImageWithThumbnail(file)
  return result.url
}

/**
 * 이미지 + 썸네일(100x100)을 함께 업로드
 * - 원본: 최대 1920px, WebP 85% 품질
 * - 썸네일: 100x100px 중앙 크롭, WebP 80% 품질
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

  // 3. HEIC 변환 (필요 시)
  let source: Blob = file
  if (isHeic(file)) {
    source = await convertHeic(file)
  }

  // 4. 원본 WebP 변환 + 리사이즈
  const blob = await toWebP(source)

  // 5. 썸네일 생성 (100x100 중앙 크롭)
  const thumbBlob = await toWebP(source, THUMBNAIL_SIZE, THUMBNAIL_QUALITY, true)

  // 6. 병렬 업로드 (원본 + 썸네일)
  const uuid = crypto.randomUUID()
  const originalPath = `${uuid}.webp`
  const thumbPath = `thumb/${uuid}.webp`

  const [origResult, thumbResult] = await Promise.all([
    supabase.storage
      .from('images')
      .upload(originalPath, blob, {
        contentType: 'image/webp',
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
