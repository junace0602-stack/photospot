/**
 * 기존 places 테이블의 주소 정보 채우기 스크립트
 *
 * 실행 방법:
 * 1. .env 파일에 환경변수 설정 필요:
 *    - VITE_SUPABASE_URL
 *    - VITE_SUPABASE_ANON_KEY
 *    - VITE_GOOGLE_MAPS_API_KEY
 *
 * 2. 실행:
 *    npx tsx scripts/backfill-places-address.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

// .env 파일 로드
dotenv.config()

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY
const GOOGLE_API_KEY = process.env.VITE_GOOGLE_MAPS_API_KEY

if (!SUPABASE_URL || !SUPABASE_KEY || !GOOGLE_API_KEY) {
  console.error('환경변수가 설정되지 않았습니다.')
  console.error('VITE_SUPABASE_URL:', SUPABASE_URL ? '✓' : '✗')
  console.error('VITE_SUPABASE_ANON_KEY:', SUPABASE_KEY ? '✓' : '✗')
  console.error('VITE_GOOGLE_MAPS_API_KEY:', GOOGLE_API_KEY ? '✓' : '✗')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

/** 시/도 이름 정규화 */
function normalizeRegion(adminArea1: string): string | null {
  const regionMap: Record<string, string> = {
    '서울특별시': '서울',
    '부산광역시': '부산',
    '대구광역시': '대구',
    '인천광역시': '인천',
    '광주광역시': '광주',
    '대전광역시': '대전',
    '울산광역시': '울산',
    '세종특별자치시': '세종',
    '경기도': '경기',
    '강원특별자치도': '강원',
    '강원도': '강원',
    '충청북도': '충북',
    '충청남도': '충남',
    '전북특별자치도': '전북',
    '전라북도': '전북',
    '전라남도': '전남',
    '경상북도': '경북',
    '경상남도': '경남',
    '제주특별자치도': '제주',
  }
  return regionMap[adminArea1] ?? null
}

interface ReverseGeocodeResult {
  address: string
  region: string | null
  district: string | null
  country: string | null
}

/** 좌표로 주소 정보 조회 (역지오코딩) */
async function reverseGeocode(lat: number, lng: number): Promise<ReverseGeocodeResult | null> {
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_API_KEY}&language=ko`

    // 디버깅: API 키와 URL 출력
    console.log('  [DEBUG] API Key:', GOOGLE_API_KEY?.substring(0, 10) + '...')
    console.log('  [DEBUG] Request URL:', url.replace(GOOGLE_API_KEY!, '***API_KEY***'))

    const res = await fetch(url)

    if (!res.ok) {
      console.error('Geocoding API error:', res.status)
      return null
    }

    const data = await res.json()

    // 디버깅: 전체 응답 출력
    console.log('  [DEBUG] Response status:', data.status)
    if (data.error_message) {
      console.log('  [DEBUG] Error message:', data.error_message)
    }

    if (data.status !== 'OK' || !data.results?.length) {
      console.warn('Geocoding no results:', data.status)
      return null
    }

    const result = data.results[0]
    const address = result.formatted_address ?? ''

    let region: string | null = null
    let district: string | null = null
    let country: string | null = null

    for (const component of result.address_components ?? []) {
      const types = component.types as string[]

      if (types.includes('administrative_area_level_1')) {
        region = normalizeRegion(component.long_name)
      }

      if (types.includes('sublocality_level_1') || types.includes('locality')) {
        if (!district) {
          district = component.long_name
        }
      }

      if (types.includes('country')) {
        country = component.long_name
      }
    }

    return { address, region, district, country }
  } catch (error) {
    console.error('Reverse geocoding error:', error)
    return null
  }
}

/** 딜레이 함수 (API 레이트 리밋 방지) */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function main() {
  console.log('=== Places 주소 정보 채우기 시작 ===\n')

  // 주소가 없는 국내 장소 조회
  const { data: places, error } = await supabase
    .from('places')
    .select('id, name, lat, lng, is_domestic, address, region, district')
    .eq('is_domestic', true)
    .is('region', null)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('장소 조회 실패:', error.message)
    process.exit(1)
  }

  if (!places || places.length === 0) {
    console.log('업데이트할 장소가 없습니다.')
    return
  }

  console.log(`총 ${places.length}개 장소 업데이트 예정\n`)

  let successCount = 0
  let failCount = 0

  for (let i = 0; i < places.length; i++) {
    const place = places[i]
    console.log(`[${i + 1}/${places.length}] ${place.name} (${place.lat}, ${place.lng})`)

    const geoResult = await reverseGeocode(place.lat, place.lng)

    if (geoResult) {
      const updateData: Record<string, unknown> = {}
      if (geoResult.address) updateData.address = geoResult.address
      if (geoResult.region) updateData.region = geoResult.region
      if (geoResult.district) updateData.district = geoResult.district

      if (Object.keys(updateData).length > 0) {
        const { error: updateError } = await supabase
          .from('places')
          .update(updateData)
          .eq('id', place.id)

        if (updateError) {
          console.log(`  ✗ 업데이트 실패: ${updateError.message}`)
          failCount++
        } else {
          console.log(`  ✓ ${geoResult.region} ${geoResult.district} - ${geoResult.address}`)
          successCount++
        }
      } else {
        console.log('  ✗ 주소 정보 없음')
        failCount++
      }
    } else {
      console.log('  ✗ 역지오코딩 실패')
      failCount++
    }

    // API 레이트 리밋 방지 (100ms 딜레이)
    if (i < places.length - 1) {
      await delay(100)
    }
  }

  console.log('\n=== 완료 ===')
  console.log(`성공: ${successCount}개`)
  console.log(`실패: ${failCount}개`)
}

main().catch(console.error)
