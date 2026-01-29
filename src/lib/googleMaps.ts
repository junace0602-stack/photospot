const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY

let _promise: Promise<void> | null = null

/**
 * Google Maps API를 동적으로 로딩한다.
 * - async script + callback 방식 → 콘솔 경고 없음
 * - 한 번만 로드되고 이후 호출은 캐시된 Promise 반환
 */
export function loadGoogleMaps(): Promise<void> {
  if (_promise) return _promise

  _promise = new Promise<void>((resolve, reject) => {
    if (typeof google !== 'undefined' && google.maps) {
      resolve()
      return
    }

    const cb = '__gmcb__'
    ;(window as any)[cb] = () => {
      delete (window as any)[cb]
      resolve()
    }

    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}&libraries=places,marker&loading=async&callback=${cb}`
    script.async = true
    script.onerror = () => {
      delete (window as any)[cb]
      _promise = null
      reject(new Error('Google Maps API failed to load'))
    }
    document.head.appendChild(script)
  })

  return _promise
}
