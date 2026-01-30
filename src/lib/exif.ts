/* ──────────────────────────────────────────────────
   EXIF 정보 추출 유틸리티
   - 촬영일시, 카메라, 렌즈, 조리개, 셔터스피드, ISO, 초점거리
   ────────────────────────────────────────────────── */

import exifr from 'exifr'

export interface ExifData {
  dateTime?: string      // 촬영일시
  camera?: string        // 카메라 모델
  lens?: string          // 렌즈
  aperture?: string      // 조리개 (F값)
  shutterSpeed?: string  // 셔터스피드
  iso?: number           // ISO
  focalLength?: string   // 초점거리
}

/** 셔터스피드 포맷팅 (1/125, 1", 30" 등) */
function formatShutterSpeed(exposureTime: number | undefined): string | undefined {
  if (!exposureTime) return undefined
  if (exposureTime >= 1) {
    return `${exposureTime}"`
  }
  const denominator = Math.round(1 / exposureTime)
  return `1/${denominator}s`
}

/** 초점거리 포맷팅 */
function formatFocalLength(focalLength: number | undefined): string | undefined {
  if (!focalLength) return undefined
  return `${Math.round(focalLength)}mm`
}

/** 조리개 포맷팅 */
function formatAperture(fNumber: number | undefined): string | undefined {
  if (!fNumber) return undefined
  // 소수점 첫째자리까지 (F2.8, F8 등)
  return `F${fNumber % 1 === 0 ? fNumber : fNumber.toFixed(1)}`
}

/** 촬영일시 포맷팅 */
function formatDateTime(dateTime: Date | string | undefined): string | undefined {
  if (!dateTime) return undefined
  const date = dateTime instanceof Date ? dateTime : new Date(dateTime)
  if (isNaN(date.getTime())) return undefined

  return date.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** File에서 EXIF 정보 추출 */
export async function extractExif(file: File): Promise<ExifData | null> {
  try {
    const exif = await exifr.parse(file, {
      pick: [
        'DateTimeOriginal',
        'CreateDate',
        'Make',
        'Model',
        'LensModel',
        'LensMake',
        'FNumber',
        'ExposureTime',
        'ISO',
        'FocalLength',
        'FocalLengthIn35mmFormat',
      ],
    })

    if (!exif) return null

    // 카메라 정보 (제조사 + 모델)
    let camera: string | undefined
    if (exif.Model) {
      camera = exif.Model
      // 모델명에 제조사가 포함되어 있지 않으면 추가
      if (exif.Make && !exif.Model.toLowerCase().includes(exif.Make.toLowerCase())) {
        camera = `${exif.Make} ${exif.Model}`
      }
    }

    // 렌즈 정보
    let lens: string | undefined
    if (exif.LensModel) {
      lens = exif.LensModel
    }

    const result: ExifData = {
      dateTime: formatDateTime(exif.DateTimeOriginal ?? exif.CreateDate),
      camera,
      lens,
      aperture: formatAperture(exif.FNumber),
      shutterSpeed: formatShutterSpeed(exif.ExposureTime),
      iso: exif.ISO,
      focalLength: formatFocalLength(exif.FocalLengthIn35mmFormat ?? exif.FocalLength),
    }

    // 모든 값이 없으면 null 반환
    const hasData = Object.values(result).some((v) => v !== undefined)
    return hasData ? result : null
  } catch {
    return null
  }
}

/** EXIF 데이터가 있는지 확인 */
export function hasExifData(exif: ExifData | null | undefined): boolean {
  if (!exif) return false
  return Object.values(exif).some((v) => v !== undefined)
}
