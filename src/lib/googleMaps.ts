const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY

let _corePromise: Promise<void> | null = null
let _placesLoaded = false

/**
 * Google Maps 코어 API 로드 (marker 라이브러리만)
 * - Places 라이브러리 제외로 초기 로드 시간 단축
 * - 한 번만 로드되고 이후 호출은 캐시된 Promise 반환
 */
export function loadGoogleMaps(): Promise<void> {
  if (_corePromise) return _corePromise

  _corePromise = new Promise<void>((resolve, reject) => {
    // 이미 로드됨
    if (typeof google !== 'undefined' && google.maps) {
      resolve()
      return
    }

    const cb = '__gmcb__'
    ;(window as unknown as Record<string, unknown>)[cb] = () => {
      delete (window as unknown as Record<string, unknown>)[cb]
      resolve()
    }

    const script = document.createElement('script')
    // marker 라이브러리만 로드 (places는 필요할 때 동적 로드)
    script.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}&libraries=marker&loading=async&callback=${cb}`
    script.async = true
    script.onerror = () => {
      delete (window as unknown as Record<string, unknown>)[cb]
      _corePromise = null
      reject(new Error('Google Maps API failed to load'))
    }
    document.head.appendChild(script)
  })

  return _corePromise
}

/**
 * Places 라이브러리 지연 로드
 * - 검색 기능 사용 시에만 호출
 * - importLibrary 사용으로 효율적 로드
 */
export async function loadPlacesLibrary(): Promise<google.maps.PlacesLibrary> {
  // 코어 API 먼저 로드
  await loadGoogleMaps()

  if (_placesLoaded) {
    return google.maps.importLibrary('places') as Promise<google.maps.PlacesLibrary>
  }

  const places = await google.maps.importLibrary('places') as google.maps.PlacesLibrary
  _placesLoaded = true
  return places
}

// 앱 시작 시 즉시 로드 시작 (백그라운드)
loadGoogleMaps()
