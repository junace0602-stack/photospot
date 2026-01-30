import { loadPlacesLibrary } from './googleMaps'

const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string

export interface AutocompleteResult {
  place_id: string
  name: string
  address: string
}

export interface PlaceDetail {
  name: string
  address: string
  lat: number
  lng: number
  country: string | null
}

export interface ReverseGeocodeResult {
  address: string
  region: string | null  // 시/도 (서울, 부산, 경기 등)
  district: string | null  // 구/군/시 (동작구, 성남시 등)
  country: string | null
}

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

/** 좌표로 주소 정보 조회 (역지오코딩) */
export async function reverseGeocode(lat: number, lng: number): Promise<ReverseGeocodeResult | null> {
  if (!GOOGLE_API_KEY) {
    console.warn('Google API key not found')
    return null
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_API_KEY}&language=ko`
    const res = await fetch(url)

    if (!res.ok) {
      console.error('Geocoding API error:', res.status)
      return null
    }

    const data = await res.json()

    if (data.status !== 'OK' || !data.results?.length) {
      console.warn('Geocoding no results:', data.status)
      return null
    }

    // 첫 번째 결과 사용 (가장 상세한 주소)
    const result = data.results[0]
    const address = result.formatted_address ?? ''

    // address_components에서 시/도, 구/군 추출
    let region: string | null = null
    let district: string | null = null
    let country: string | null = null

    for (const component of result.address_components ?? []) {
      const types = component.types as string[]

      // 시/도 (administrative_area_level_1)
      if (types.includes('administrative_area_level_1')) {
        region = normalizeRegion(component.long_name)
      }

      // 구/군/시 (sublocality_level_1 또는 locality)
      if (types.includes('sublocality_level_1') || types.includes('locality')) {
        if (!district) {
          district = component.long_name
        }
      }

      // 나라
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

export async function searchPlacesAutocomplete(query: string, regionCodes?: string[]): Promise<AutocompleteResult[]> {
  try {
    // Places 라이브러리 지연 로드 (검색할 때만)
    await loadPlacesLibrary()
  } catch {
    return []
  }

  try {
    const request: google.maps.places.AutocompleteRequest = { input: query }
    if (regionCodes && regionCodes.length > 0) {
      request.includedRegionCodes = regionCodes
    }

    const { suggestions } = await google.maps.places.AutocompleteSuggestion
      .fetchAutocompleteSuggestions(request)

    return suggestions
      .filter((s) => s.placePrediction)
      .slice(0, 5)
      .map((s) => {
        const p = s.placePrediction!
        return {
          place_id: p.placeId,
          name: p.mainText?.text ?? '',
          address: p.secondaryText?.text ?? '',
        }
      })
  } catch {
    return []
  }
}

export async function getPlaceDetails(placeId: string): Promise<PlaceDetail | null> {
  try {
    // Places 라이브러리 지연 로드 (검색할 때만)
    await loadPlacesLibrary()
  } catch {
    return null
  }

  try {
    const place = new google.maps.places.Place({ id: placeId })
    await place.fetchFields({ fields: ['displayName', 'formattedAddress', 'location', 'addressComponents'] })

    const loc = place.location
    let lat = 0
    let lng = 0
    if (loc) {
      const latVal = loc.lat
      const lngVal = loc.lng
      lat = typeof latVal === 'function' ? latVal() : latVal
      lng = typeof lngVal === 'function' ? lngVal() : lngVal
    }

    const countryComponent = place.addressComponents?.find((c) => c.types.includes('country'))

    return {
      name: place.displayName ?? '',
      address: place.formattedAddress ?? '',
      lat,
      lng,
      country: countryComponent?.longText ?? null,
    }
  } catch {
    return null
  }
}
