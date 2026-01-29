import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, MapPin, FileText, Navigation } from 'lucide-react'

function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)}m`
  if (km < 10) return `${km.toFixed(1)}km`
  return `${Math.round(km)}km`
}

export default function UnregisteredSpotPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const name = searchParams.get('name') || '알 수 없는 장소'
  const address = searchParams.get('address') || ''
  const lat = parseFloat(searchParams.get('lat') || '0')
  const lng = parseFloat(searchParams.get('lng') || '0')

  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null)
  const [distance, setDistance] = useState<number | null>(null)

  // 사용자 위치 가져오기
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {}
      )
    }
  }, [])

  // 거리 계산
  useEffect(() => {
    if (lat && lng && userPos) {
      const dist = Math.sqrt(
        Math.pow((lat - userPos.lat) * 111, 2) +
        Math.pow((lng - userPos.lng) * 88, 2)
      )
      setDistance(dist)
    }
  }, [lat, lng, userPos])

  const handleOpenMap = () => {
    // Google Maps로 길찾기
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank')
  }

  return (
    <div className="relative flex flex-col h-full bg-gray-50">
      <header className="shrink-0 flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-200">
        <button type="button" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-6 h-6 text-gray-700" />
        </button>
        <h1 className="text-lg font-bold truncate">{name}</h1>
      </header>

      {/* 상단 배너 */}
      <div className="shrink-0 bg-white border-b border-gray-200 p-4">
        <div className="flex items-center gap-4">
          {/* 썸네일 */}
          <div className="w-20 h-20 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
            <MapPin className="w-8 h-8 text-orange-500" />
          </div>
          {/* 정보 */}
          <div className="flex-1 min-w-0">
            <p className="text-lg font-bold text-gray-900 truncate">
              {name}
            </p>
            {address && (
              <p className="text-sm text-gray-500 truncate mt-0.5">
                {address}
              </p>
            )}
            <div className="flex items-center gap-3 mt-1.5 text-sm text-gray-500">
              {distance !== null && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {formatDistance(distance)}
                </span>
              )}
              <span className="flex items-center gap-1">
                <FileText className="w-4 h-4" />
                등록된 글 없음
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 본문 */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="flex flex-col items-center justify-center h-full text-center">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <FileText className="w-8 h-8 text-gray-300" />
          </div>
          <p className="text-gray-500 mb-1">아직 등록된 출사지가 아닙니다.</p>
          <p className="text-sm text-gray-400">
            이 장소에 대한 글을 처음으로 작성해보세요!
          </p>
        </div>
      </div>

      {/* 하단 버튼 */}
      <div className="shrink-0 px-4 py-3 bg-white border-t border-gray-200">
        <button
          type="button"
          onClick={handleOpenMap}
          className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 text-white rounded-xl font-semibold"
        >
          <Navigation className="w-5 h-5" />
          길찾기
        </button>
      </div>
    </div>
  )
}
