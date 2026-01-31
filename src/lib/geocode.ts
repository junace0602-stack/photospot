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

/** 영어 국가명 → 한국어 국가명 매핑 */
const COUNTRY_NAME_MAP: Record<string, string> = {
  // 아시아
  'Japan': '일본',
  'Taiwan': '대만',
  'Thailand': '태국',
  'Vietnam': '베트남',
  'China': '중국',
  'Hong Kong': '홍콩',
  'Macao': '마카오',
  'Macau': '마카오',
  'Singapore': '싱가포르',
  'Malaysia': '말레이시아',
  'Indonesia': '인도네시아',
  'Philippines': '필리핀',
  'India': '인도',
  'Nepal': '네팔',
  'Sri Lanka': '스리랑카',
  'Maldives': '몰디브',
  'Cambodia': '캄보디아',
  'Laos': '라오스',
  'Myanmar': '미얀마',
  'Mongolia': '몽골',
  'Kazakhstan': '카자흐스탄',
  'Uzbekistan': '우즈베키스탄',
  // 미주
  'United States': '미국',
  'USA': '미국',
  'Canada': '캐나다',
  'Mexico': '멕시코',
  'Brazil': '브라질',
  'Argentina': '아르헨티나',
  'Peru': '페루',
  'Chile': '칠레',
  'Colombia': '콜롬비아',
  'Cuba': '쿠바',
  // 유럽
  'United Kingdom': '영국',
  'UK': '영국',
  'France': '프랑스',
  'Germany': '독일',
  'Italy': '이탈리아',
  'Spain': '스페인',
  'Portugal': '포르투갈',
  'Netherlands': '네덜란드',
  'Belgium': '벨기에',
  'Switzerland': '스위스',
  'Austria': '오스트리아',
  'Czech Republic': '체코',
  'Czechia': '체코',
  'Poland': '폴란드',
  'Hungary': '헝가리',
  'Greece': '그리스',
  'Turkey': '터키',
  'Türkiye': '터키',
  'Croatia': '크로아티아',
  'Romania': '루마니아',
  'Ireland': '아일랜드',
  'Norway': '노르웨이',
  'Sweden': '스웨덴',
  'Finland': '핀란드',
  'Denmark': '덴마크',
  'Iceland': '아이슬란드',
  'Russia': '러시아',
  // 오세아니아
  'Australia': '호주',
  'New Zealand': '뉴질랜드',
  'Guam': '괌',
  'Northern Mariana Islands': '사이판',
  // 중동/아프리카
  'United Arab Emirates': '아랍에미리트',
  'UAE': '아랍에미리트',
  'Israel': '이스라엘',
  'Jordan': '요르단',
  'Egypt': '이집트',
  'Morocco': '모로코',
  'South Africa': '남아공',
  'Kenya': '케냐',
  'Tanzania': '탄자니아',
  'Oman': '오만',
  // 한국
  'South Korea': '한국',
  'Korea': '한국',
  'Republic of Korea': '한국',
}

/** 국가명을 한국어로 정규화 */
export function normalizeCountryName(countryName: string | null): string | null {
  if (!countryName) return null
  // 이미 한국어면 그대로 반환
  if (/[가-힣]/.test(countryName)) return countryName
  // 영어 → 한국어 매핑
  return COUNTRY_NAME_MAP[countryName] ?? countryName
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

    return { address, region, district, country: normalizeCountryName(country) }
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
    const rawCountry = countryComponent?.longText ?? null

    return {
      name: place.displayName ?? '',
      address: place.formattedAddress ?? '',
      lat,
      lng,
      country: normalizeCountryName(rawCountry),
    }
  } catch {
    return null
  }
}
