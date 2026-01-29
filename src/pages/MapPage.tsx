import { memo, useCallback, useEffect, useRef, useState, useMemo, useLayoutEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FileText,
  ThumbsUp,
  Share2,
  MapPin,
  Search,
  ChevronRight,
  X,
  Crosshair,
  Loader2,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { share } from '../utils/share'
import { supabase } from '../lib/supabase'
import type { Place } from '../lib/types'
import { useFavorites } from '../hooks/useFavorites'
import FavoriteButton from '../components/FavoriteButton'
import { loadGoogleMaps } from '../lib/googleMaps'
import { MarkerClusterer } from '@googlemaps/markerclusterer'
import type { Renderer } from '@googlemaps/markerclusterer'

// 모듈 임포트 시 즉시 Google Maps 로딩 시작 (앱 초기화와 병렬)
const mapsReady = loadGoogleMaps()

// 지도 인스턴스 전역 캐싱 (탭 이동해도 재사용)
let cachedMapInstance: google.maps.Map | null = null
let cachedClusterer: MarkerClusterer | null = null
let cachedMarkers: Map<string, google.maps.marker.AdvancedMarkerElement> | null = null
let cachedUserMarker: google.maps.marker.AdvancedMarkerElement | null = null

// 마커 클릭 핸들러 (컴포넌트 외부에서 접근 가능하도록)
let markerClickHandler: ((placeId: string) => void) | null = null

const SEOUL = { lat: 37.5665, lng: 126.978 }

const COUNTRY_CENTERS: Record<string, { lat: number; lng: number; zoom: number }> = {
  '일본': { lat: 36.2, lng: 138.3, zoom: 5 },
  '대만': { lat: 23.7, lng: 120.9, zoom: 7 },
  '태국': { lat: 15.9, lng: 101.0, zoom: 6 },
  '베트남': { lat: 14.1, lng: 108.3, zoom: 6 },
  '미국': { lat: 37.1, lng: -95.7, zoom: 4 },
  '중국': { lat: 35.9, lng: 104.2, zoom: 4 },
  '영국': { lat: 55.4, lng: -3.4, zoom: 5 },
  '프랑스': { lat: 46.2, lng: 2.2, zoom: 5 },
  '독일': { lat: 51.2, lng: 10.4, zoom: 5 },
  '이탈리아': { lat: 41.9, lng: 12.6, zoom: 5 },
  '스페인': { lat: 40.5, lng: -3.7, zoom: 5 },
  '호주': { lat: -25.3, lng: 133.8, zoom: 4 },
  '캐나다': { lat: 56.1, lng: -106.3, zoom: 3 },
  '인도네시아': { lat: -0.8, lng: 113.9, zoom: 4 },
  '말레이시아': { lat: 4.2, lng: 101.9, zoom: 6 },
  '싱가포르': { lat: 1.35, lng: 103.8, zoom: 11 },
  '필리핀': { lat: 12.9, lng: 121.8, zoom: 5 },
  '홍콩': { lat: 22.4, lng: 114.1, zoom: 10 },
  '스위스': { lat: 46.8, lng: 8.2, zoom: 7 },
  '뉴질랜드': { lat: -40.9, lng: 174.9, zoom: 5 },
  '터키': { lat: 38.9, lng: 35.2, zoom: 5 },
  '멕시코': { lat: 23.6, lng: -102.6, zoom: 5 },
  '브라질': { lat: -14.2, lng: -51.9, zoom: 4 },
  '네덜란드': { lat: 52.1, lng: 5.3, zoom: 7 },
  '체코': { lat: 49.8, lng: 15.5, zoom: 7 },
  '그리스': { lat: 39.1, lng: 21.8, zoom: 6 },
  '노르웨이': { lat: 60.5, lng: 8.5, zoom: 4 },
  '스웨덴': { lat: 60.1, lng: 18.6, zoom: 4 },
  '아이슬란드': { lat: 64.9, lng: -19.0, zoom: 6 },
  '크로아티아': { lat: 45.1, lng: 15.2, zoom: 7 },
  '포르투갈': { lat: 39.4, lng: -8.2, zoom: 6 },
  '몽골': { lat: 46.9, lng: 103.8, zoom: 5 },
  '캄보디아': { lat: 12.6, lng: 105.0, zoom: 7 },
  '라오스': { lat: 19.9, lng: 102.5, zoom: 6 },
  '네팔': { lat: 28.4, lng: 84.1, zoom: 7 },
  '몰디브': { lat: 3.2, lng: 73.2, zoom: 7 },
  '괌': { lat: 13.4, lng: 144.8, zoom: 10 },
  '사이판': { lat: 15.2, lng: 145.7, zoom: 11 },
  '인도': { lat: 20.6, lng: 78.9, zoom: 4 },
  '카자흐스탄': { lat: 48.0, lng: 66.9, zoom: 4 },
  '우즈베키스탄': { lat: 41.4, lng: 64.6, zoom: 5 },
  '오스트리아': { lat: 47.5, lng: 14.6, zoom: 7 },
  '아르헨티나': { lat: -38.4, lng: -63.6, zoom: 4 },
  '페루': { lat: -9.2, lng: -75.0, zoom: 5 },
  '칠레': { lat: -35.7, lng: -71.5, zoom: 4 },
  '아랍에미리트': { lat: 23.4, lng: 53.8, zoom: 7 },
  '이집트': { lat: 26.8, lng: 30.8, zoom: 5 },
  '모로코': { lat: 31.8, lng: -7.1, zoom: 5 },
  '남아공': { lat: -30.6, lng: 22.9, zoom: 5 },
  '마카오': { lat: 22.2, lng: 113.5, zoom: 12 },
  '미얀마': { lat: 19.8, lng: 96.1, zoom: 5 },
  '스리랑카': { lat: 7.9, lng: 80.8, zoom: 7 },
  '핀란드': { lat: 61.9, lng: 25.7, zoom: 5 },
  '덴마크': { lat: 56.3, lng: 9.5, zoom: 6 },
  '폴란드': { lat: 51.9, lng: 19.1, zoom: 6 },
  '헝가리': { lat: 47.2, lng: 19.5, zoom: 7 },
  '벨기에': { lat: 50.5, lng: 4.5, zoom: 8 },
  '아일랜드': { lat: 53.1, lng: -7.7, zoom: 6 },
  '루마니아': { lat: 45.9, lng: 24.9, zoom: 6 },
  '콜롬비아': { lat: 4.6, lng: -74.3, zoom: 5 },
  '쿠바': { lat: 21.5, lng: -77.8, zoom: 6 },
  '요르단': { lat: 30.6, lng: 36.2, zoom: 7 },
  '이스라엘': { lat: 31.0, lng: 34.9, zoom: 7 },
  '오만': { lat: 21.5, lng: 55.9, zoom: 6 },
  '탄자니아': { lat: -6.4, lng: 34.9, zoom: 5 },
  '케냐': { lat: -0.02, lng: 37.9, zoom: 6 },
}
const POPULAR_COUNTRIES = ['일본', '대만', '태국', '베트남', '미국']

/** 나라 이름 한글↔영어 매핑 (검색용) */
const COUNTRY_ALIASES: Record<string, string[]> = {
  '일본': ['japan', 'jp'],
  '대만': ['taiwan', 'tw'],
  '태국': ['thailand', 'th'],
  '베트남': ['vietnam', 'vn'],
  '미국': ['usa', 'us', 'america', 'united states'],
  '중국': ['china', 'cn'],
  '영국': ['uk', 'england', 'united kingdom'],
  '프랑스': ['france', 'fr'],
  '독일': ['germany', 'de'],
  '이탈리아': ['italy', 'it'],
  '스페인': ['spain', 'es'],
  '호주': ['australia', 'au'],
  '캐나다': ['canada', 'ca'],
  '인도네시아': ['indonesia', 'id'],
  '말레이시아': ['malaysia', 'my'],
  '싱가포르': ['singapore', 'sg'],
  '필리핀': ['philippines', 'ph'],
  '홍콩': ['hong kong', 'hk'],
  '스위스': ['switzerland', 'ch'],
  '뉴질랜드': ['new zealand', 'nz'],
  '터키': ['turkey', 'turkiye', 'tr'],
  '멕시코': ['mexico', 'mx'],
  '브라질': ['brazil', 'br'],
  '네덜란드': ['netherlands', 'nl', 'holland'],
  '체코': ['czech', 'czechia', 'cz'],
  '그리스': ['greece', 'gr'],
  '노르웨이': ['norway', 'no'],
  '스웨덴': ['sweden', 'se'],
  '아이슬란드': ['iceland', 'is'],
  '크로아티아': ['croatia', 'hr'],
  '포르투갈': ['portugal', 'pt'],
  '몽골': ['mongolia', 'mn'],
  '캄보디아': ['cambodia', 'kh'],
  '라오스': ['laos', 'la'],
  '네팔': ['nepal', 'np'],
  '몰디브': ['maldives', 'mv'],
  '괌': ['guam', 'gu'],
  '사이판': ['saipan'],
  '인도': ['india', 'in'],
  '카자흐스탄': ['kazakhstan', 'kz'],
  '우즈베키스탄': ['uzbekistan', 'uz'],
  '오스트리아': ['austria', 'at'],
  '아르헨티나': ['argentina', 'ar'],
  '페루': ['peru', 'pe'],
  '칠레': ['chile', 'cl'],
  '아랍에미리트': ['uae', 'united arab emirates', 'dubai', 'ae'],
  '이집트': ['egypt', 'eg'],
  '모로코': ['morocco', 'ma'],
  '남아공': ['south africa', 'za'],
  '마카오': ['macau', 'macao', 'mo'],
  '미얀마': ['myanmar', 'burma', 'mm'],
  '스리랑카': ['sri lanka', 'lk'],
  '핀란드': ['finland', 'fi'],
  '덴마크': ['denmark', 'dk'],
  '폴란드': ['poland', 'pl'],
  '헝가리': ['hungary', 'hu'],
  '벨기에': ['belgium', 'be'],
  '아일랜드': ['ireland', 'ie'],
  '루마니아': ['romania', 'ro'],
  '콜롬비아': ['colombia', 'co'],
  '쿠바': ['cuba', 'cu'],
  '요르단': ['jordan', 'jo'],
  '이스라엘': ['israel', 'il'],
  '오만': ['oman', 'om'],
  '탄자니아': ['tanzania', 'tz'],
  '케냐': ['kenya', 'ke'],
}
const ALL_KNOWN_COUNTRIES = Object.keys(COUNTRY_ALIASES)

function createPinContent(count: number): HTMLDivElement {
  let fill: string
  if (count >= 16) fill = '#E5383B'
  else if (count >= 6) fill = '#F59E0B'
  else fill = '#22C55E'

  const scale = count >= 16 ? 1.2 : count >= 6 ? 1.1 : 1
  const w = Math.round(28 * scale)
  const h = Math.round(40 * scale)
  const fs = count >= 100 ? 10 : 12

  const el = document.createElement('div')
  el.style.cssText = 'cursor:pointer;line-height:0;filter:drop-shadow(0 1px 2px rgba(0,0,0,0.3));'
  el.innerHTML =
    `<svg width="${w}" height="${h}" viewBox="0 0 28 40">` +
    `<path d="M14 0C6.3 0 0 6.3 0 14c0 10.5 14 26 14 26s14-15.5 14-26C28 6.3 21.7 0 14 0z" fill="${fill}"/>` +
    `<text x="14" y="15" text-anchor="middle" dominant-baseline="central" fill="#fff" font-size="${fs}" font-weight="700" font-family="sans-serif">${count}</text>` +
    '</svg>'
  return el
}

const clusterRenderer: Renderer = {
  render({ count, position }) {
    return new google.maps.marker.AdvancedMarkerElement({
      position,
      content: createPinContent(count),
      zIndex: count,
    })
  },
}

function matchesCountry(country: string, query: string): boolean {
  const q = query.toLowerCase()
  if (country.toLowerCase().includes(q)) return true
  const aliases = COUNTRY_ALIASES[country]
  return aliases ? aliases.some((a) => a.includes(q)) : false
}

function getDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
) {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function formatDistance(km: number) {
  if (km < 1) return `${Math.round(km * 1000)}m`
  return `${km.toFixed(1)}km`
}

interface PlaceStats {
  thumbnail: string | null
  postCount: number
  likesSum: number
  latestPostDate: string
  hasPopularPost: boolean
}

interface PlaceItemProps {
  place: Place & { distance: number }
  stats: PlaceStats | undefined
  onSelect: (place: Place & { distance: number }) => void
}

const PlaceItem = memo(function PlaceItem({
  place,
  stats,
  onSelect,
}: PlaceItemProps) {
  const handleClick = () => onSelect(place)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') onSelect(place)
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className="w-full flex items-center gap-3 px-4 py-3 border-b border-gray-100 text-left cursor-pointer"
    >
      {stats?.thumbnail ? (
        <img
          src={stats.thumbnail}
          alt={place.name}
          loading="lazy"
          decoding="async"
          className="w-14 h-14 rounded-lg object-cover shrink-0"
        />
      ) : (
        <div className="w-14 h-14 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
          <MapPin className="w-5 h-5 text-gray-300" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 truncate">
          {place.name}
        </p>
        <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-400">
          <span>{formatDistance(place.distance)}</span>
          <span>·</span>
          <span>글 {stats?.postCount ?? 0}개</span>
        </div>
      </div>
      <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
    </div>
  )
})

export default function MapPage() {
  const mapRef = useRef<HTMLDivElement>(null)
  const sheetRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const { isFavorited, toggleFavorite } = useFavorites()

  const [places, setPlaces] = useState<Place[]>([])
  const [userPos, setUserPos] = useState(SEOUL)
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null)
  const [placeStats, setPlaceStats] = useState<Map<string, PlaceStats>>(
    new Map(),
  )

  // 하단 시트 — snappedTop: 80 | 50 | 0 (개념적 %, React state)
  // currentTopRef: 실제 px 위치 (드래그 중 ref로만 관리)
  const [snappedTop, setSnappedTop] = useState(87)
  const dragRef = useRef({ startY: 0, startTopPx: 0, dragging: false })
  const currentTopRef = useRef(0) // px — useLayoutEffect에서 초기화
  const skipTransitionRef = useRef(false)
  const isFirstSnapRef = useRef(true)
  const rafRef = useRef(0)
  const pendingYRef = useRef(0)
  const listRef = useRef<HTMLDivElement>(null)

  // 지도 인스턴스 + 마커 ref (region/country 변경 시 접근)
  const mapInstanceRef = useRef<google.maps.Map | null>(null)
  const markersRef = useRef<Map<string, google.maps.marker.AdvancedMarkerElement>>(new Map())
  const userLocationMarkerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null)
  const clustererRef = useRef<MarkerClusterer | null>(null)
  const [mapReady, setMapReady] = useState(false)

  // 국내/해외
  const [region, setRegion] = useState<'domestic' | 'international'>('domestic')
  const [countryFilter, setCountryFilter] = useState<string | null>(null)
  const [countrySearch, setCountrySearch] = useState('')

  // 목록 컨트롤
  const [listSort, setListSort] = useState<'nearest' | 'newest' | 'popular'>('nearest')
  const [searchQuery, setSearchQuery] = useState('')

  // Google Places 검색 결과 (New API)
  interface GooglePlaceResult {
    id: string
    displayName: string
    formattedAddress: string
    location: { lat: number; lng: number }
  }
  const [googlePlaces, setGooglePlaces] = useState<GooglePlaceResult[]>([])
  const [searchingGoogle, setSearchingGoogle] = useState(false)

  // 하단 장소 배너 (등록된 장소 또는 미등록 장소)
  interface BannerPlace {
    type: 'registered' | 'unregistered'
    id: string
    name: string
    address: string
    lat: number
    lng: number
    thumbnail?: string
    postCount?: number
    distance?: number
  }
  const [bannerPlace, setBannerPlace] = useState<BannerPlace | null>(null)
  const tempMarkerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null)

  const sheetState: 'peek' | 'half' | 'full' =
    snappedTop > 75 ? 'peek' : snappedTop > 25 ? 'half' : 'full'

  // 정적 style — React가 직접 DOM 조작을 덮어쓰지 않도록 고정
  // will-change는 드래그 중에만 동적으로 적용 (상시 적용 시 메모리 낭비)
  const sheetStyle = useMemo(
    () => ({ transform: 'translateY(87vh)', maxHeight: '13vh' }),
    [],
  )

  /** snappedTop(개념 %) → 실제 px 변환 */
  const snapToPx = useCallback((snap: number) => {
    const vh = window.innerHeight
    if (snap === 0) return 0
    if (snap <= 50) return vh * 0.5
    return vh * 0.87
  }, [])

  /* ── 스냅 트랜지션 적용 (snappedTop 변경 시) ── */
  useLayoutEffect(() => {
    const el = sheetRef.current
    if (!el) return

    const px = snapToPx(snappedTop)

    if (isFirstSnapRef.current) {
      isFirstSnapRef.current = false
      el.style.transition = 'none'
    } else if (skipTransitionRef.current) {
      el.style.transition = 'none'
      skipTransitionRef.current = false
    } else {
      el.style.transition = 'transform 0.3s ease-out, max-height 0.3s ease-out'
    }

    el.style.transform = `translateY(${px}px)`
    el.style.maxHeight = `${window.innerHeight - px}px`
    currentTopRef.current = px
  }, [snappedTop, snapToPx])

  /* ── 데이터 로드 + 지도 초기화 (최적화) ── */
  useEffect(() => {
    if (!mapRef.current) return

    let mounted = true

    // 데이터 fetch 시작 (지도 로딩과 병렬)
    const dataPromise = Promise.all([
      supabase.from('places').select('*'),
      supabase
        .from('posts')
        .select('place_id, thumbnail_url, likes_count, created_at')
        .order('likes_count', { ascending: false }),
    ])

    const initMap = async () => {
      // 1. Google Maps API 로딩 완료 대기
      await mapsReady
      if (!mounted || !mapRef.current) return

      // 2. 캐시된 지도 인스턴스 재사용 또는 새로 생성
      let map: google.maps.Map
      if (cachedMapInstance) {
        // 캐시된 인스턴스 재사용 (DOM에 다시 연결)
        map = cachedMapInstance
        mapRef.current.appendChild(map.getDiv())
        mapInstanceRef.current = map
        markersRef.current = cachedMarkers || new Map()
        clustererRef.current = cachedClusterer
        userLocationMarkerRef.current = cachedUserMarker
        setMapReady(true)
      } else {
        // 서울 좌표로 먼저 지도 표시 (GPS 기다리지 않음)
        map = new google.maps.Map(mapRef.current, {
          center: SEOUL,
          zoom: 11,
          mapId: 'DEMO_MAP_ID',
          gestureHandling: 'greedy',
          zoomControl: false,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        })
        mapInstanceRef.current = map
        cachedMapInstance = map

        const minimizeSheet = () => {
          skipTransitionRef.current = true
          setSnappedTop(87)
          setSelectedPlace(null)
        }
        map.addListener('click', minimizeSheet)
        map.addListener('dragstart', minimizeSheet)

        setMapReady(true)
      }

      // 3. 데이터 로드 완료 대기 후 마커 생성
      const [placesRes, postsRes] = await dataPromise
      if (!mounted) return

      const fetched = (placesRes.data ?? []) as Place[]
      setPlaces(fetched)

      // 장소별 통계 계산
      const stats = new Map<string, PlaceStats>()
      for (const p of postsRes.data ?? []) {
        const s = stats.get(p.place_id)
        if (s) {
          s.postCount++
          s.likesSum += p.likes_count
          if (!s.thumbnail && p.thumbnail_url) s.thumbnail = p.thumbnail_url
          if (p.created_at > s.latestPostDate) s.latestPostDate = p.created_at
          if (p.likes_count >= 3) s.hasPopularPost = true
        } else {
          stats.set(p.place_id, {
            thumbnail: p.thumbnail_url,
            postCount: 1,
            likesSum: p.likes_count,
            latestPostDate: p.created_at,
            hasPopularPost: p.likes_count >= 3,
          })
        }
      }
      setPlaceStats(stats)

      // 4. 마커 생성 (캐시 없을 때만)
      if (!cachedMarkers) {
        const markerMap = new Map<string, google.maps.marker.AdvancedMarkerElement>()
        fetched.forEach((place) => {
          const marker = new google.maps.marker.AdvancedMarkerElement({
            position: { lat: place.lat, lng: place.lng },
            content: createPinContent(1),
          })
          // 클릭 핸들러는 모듈 레벨 함수를 통해 호출 (캐시된 마커도 최신 핸들러 사용)
          const placeId = place.id
          marker.addListener('gmp-click', () => {
            if (markerClickHandler) {
              markerClickHandler(placeId)
            }
          })
          markerMap.set(place.id, marker)
        })
        markersRef.current = markerMap
        cachedMarkers = markerMap
      }

      // 5. 클러스터러 생성 (캐시 없을 때만)
      if (!cachedClusterer) {
        const clusterer = new MarkerClusterer({
          map,
          markers: [],
          renderer: clusterRenderer,
        })
        clustererRef.current = clusterer
        cachedClusterer = clusterer
      }
    }

    // GPS 위치 요청 (백그라운드 - 지도 초기화 블로킹 안 함)
    const requestGPS = () => {
      if (!navigator.geolocation) return

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (!mounted) return
          const lat = pos.coords.latitude
          const lng = pos.coords.longitude
          setUserPos({ lat, lng })

          const map = mapInstanceRef.current
          if (map) {
            map.panTo({ lat, lng })
            map.setZoom(11)
          }

          // 사용자 위치 마커 표시
          if (!cachedUserMarker && map) {
            const dot = document.createElement('div')
            dot.style.cssText =
              'width:18px;height:18px;background:#EA580C;border:3px solid #fff;border-radius:50%;box-shadow:0 0 0 1px rgba(0,0,0,0.1),0 1px 4px rgba(0,0,0,0.3);'
            const marker = new google.maps.marker.AdvancedMarkerElement({
              position: { lat, lng },
              map,
              content: dot,
              zIndex: 9999,
            })
            userLocationMarkerRef.current = marker
            cachedUserMarker = marker
          } else if (cachedUserMarker) {
            cachedUserMarker.position = { lat, lng }
            userLocationMarkerRef.current = cachedUserMarker
          }
        },
        () => {
          // GPS 실패 시 서울 유지
        },
        { enableHighAccuracy: false, timeout: 5000 } // 빠른 응답 우선
      )
    }

    // 지도 초기화와 GPS 요청 병렬 실행
    initMap()
    requestGPS()

    return () => {
      mounted = false
    }
  }, [])

  /* ── 국내/해외 전환 · 나라 필터 → 지도 뷰 + 마커 표시 ── */
  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map || !mapReady) return

    // 지도 뷰 조정
    if (region === 'domestic') {
      map.setCenter(userPos)
      map.setZoom(11)
    } else if (countryFilter && COUNTRY_CENTERS[countryFilter]) {
      const c = COUNTRY_CENTERS[countryFilter]
      map.setCenter({ lat: c.lat, lng: c.lng })
      map.setZoom(c.zoom)
    } else {
      map.setCenter({ lat: 30, lng: 120 })
      map.setZoom(3)
    }

    // 클러스터러에 해당 마커만 추가
    const clusterer = clustererRef.current
    if (!clusterer) return

    clusterer.clearMarkers()
    const visible: google.maps.marker.AdvancedMarkerElement[] = []
    markersRef.current.forEach((marker, placeId) => {
      const place = places.find((p) => p.id === placeId)
      if (!place) return
      const isDomestic = place.is_domestic !== false && (!place.country || place.country === '한국')
      if (region === 'domestic') {
        if (isDomestic) visible.push(marker)
      } else {
        const isIntl = !isDomestic
        if (isIntl && (!countryFilter || place.country === countryFilter)) visible.push(marker)
      }
    })
    clusterer.addMarkers(visible)
  }, [mapReady, region, countryFilter, places, userPos])

  /* ── 정렬 · 필터된 장소 목록 ── */
  const displayedPlaces = useMemo(() => {
    let items = places.map((p) => ({
      ...p,
      distance: getDistanceKm(userPos.lat, userPos.lng, p.lat, p.lng),
    }))

    // 국내/해외 필터 — is_domestic + country 이중 체크
    if (region === 'domestic') {
      items = items.filter((p) =>
        p.is_domestic !== false && (!p.country || p.country === '한국'),
      )
    } else {
      items = items.filter((p) =>
        p.is_domestic === false || (p.country != null && p.country !== '한국'),
      )
      if (countryFilter) {
        items = items.filter((p) => p.country === countryFilter)
      }
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      items = items.filter((p) => p.name.toLowerCase().includes(q))
    }

    if (listSort === 'popular') {
      items.sort((a, b) => (placeStats.get(b.id)?.postCount ?? 0) - (placeStats.get(a.id)?.postCount ?? 0))
    } else if (listSort === 'nearest') {
      items.sort((a, b) => a.distance - b.distance)
    } else {
      items.sort((a, b) => {
        const dateA = placeStats.get(a.id)?.latestPostDate ?? ''
        const dateB = placeStats.get(b.id)?.latestPostDate ?? ''
        return dateB.localeCompare(dateA)
      })
    }

    return items
  }, [places, userPos, placeStats, searchQuery, listSort, region, countryFilter])

  // 나라 검색 결과 (모든 알려진 나라에서 검색)
  const filteredCountries = useMemo(() => {
    const q = countrySearch.trim()
    if (!q) return []
    return ALL_KNOWN_COUNTRIES.filter((c) => matchesCountry(c, q))
  }, [countrySearch])

  // 나라별 출사지/글 통계
  const countryStats = useMemo(() => {
    const stats = new Map<string, { placeCount: number; postCount: number }>()
    places.forEach((p) => {
      if (p.country && p.country !== '한국') {
        const existing = stats.get(p.country)
        const postCount = placeStats.get(p.id)?.postCount ?? 0
        if (existing) {
          existing.placeCount++
          existing.postCount += postCount
        } else {
          stats.set(p.country, { placeCount: 1, postCount })
        }
      }
    })
    return stats
  }, [places, placeStats])

  const isCountrySearching = region === 'international' && !countryFilter && countrySearch.trim().length > 0

  // Google Places 검색 (DB에 결과 없을 때) - New API 사용
  useEffect(() => {
    if (!searchQuery.trim() || region !== 'domestic') {
      setGooglePlaces([])
      return
    }

    // DB에 결과가 있으면 Google 검색 안 함
    if (displayedPlaces.length > 0) {
      setGooglePlaces([])
      return
    }

    const timer = setTimeout(async () => {
      setSearchingGoogle(true)
      try {
        // Places API (New) - searchByText 사용
        const { Place } = await google.maps.importLibrary('places') as google.maps.PlacesLibrary
        const { places } = await Place.searchByText({
          textQuery: searchQuery,
          fields: ['id', 'displayName', 'formattedAddress', 'location'],
          maxResultCount: 10,
          region: 'kr',
        })

        if (places && places.length > 0) {
          setGooglePlaces(
            places.map((p) => ({
              id: p.id || '',
              displayName: p.displayName || '',
              formattedAddress: p.formattedAddress || '',
              location: p.location
                ? { lat: p.location.lat(), lng: p.location.lng() }
                : { lat: 0, lng: 0 },
            }))
          )
        } else {
          setGooglePlaces([])
        }
      } catch {
        setGooglePlaces([])
      } finally {
        setSearchingGoogle(false)
      }
    }, 500) // debounce

    return () => clearTimeout(timer)
  }, [searchQuery, region, displayedPlaces.length])

  // Google Places 결과 클릭 핸들러
  const handleGooglePlaceClick = useCallback((place: GooglePlaceResult) => {
    if (!place.location || !mapInstanceRef.current) return

    const { lat, lng } = place.location

    // 거리 계산
    const dist = userPos
      ? Math.sqrt(Math.pow((lat - userPos.lat) * 111, 2) + Math.pow((lng - userPos.lng) * 88, 2))
      : undefined

    // 배너 설정
    setBannerPlace({
      type: 'unregistered',
      id: place.id,
      name: place.displayName,
      address: place.formattedAddress,
      lat,
      lng,
      postCount: 0,
      distance: dist,
    })

    // 지도 이동
    mapInstanceRef.current.panTo({ lat, lng })
    mapInstanceRef.current.setZoom(15)

    // 기존 임시 마커 제거
    if (tempMarkerRef.current) {
      tempMarkerRef.current.map = null
    }

    // 임시 마커 표시 (주황색)
    const markerContent = document.createElement('div')
    markerContent.innerHTML = `
      <div style="width:32px;height:32px;background:#f97316;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
      </div>
    `
    tempMarkerRef.current = new google.maps.marker.AdvancedMarkerElement({
      map: mapInstanceRef.current,
      position: { lat, lng },
      title: place.displayName || '검색 결과',
      content: markerContent,
    })

    setSnappedTop(87) // 시트 접기
    setSearchQuery('')
  }, [userPos])

  // 등록된 장소 클릭 → 배너 표시 (마커 클릭 & 목록 클릭 공용)
  const handlePlaceClick = useCallback((place: Place & { distance?: number }) => {
    const stats = placeStats.get(place.id)
    const dist = place.distance ?? (userPos
      ? getDistanceKm(userPos.lat, userPos.lng, place.lat, place.lng)
      : undefined)

    // 배너 설정
    setBannerPlace({
      type: 'registered',
      id: place.id,
      name: place.name,
      address: '',
      lat: place.lat,
      lng: place.lng,
      thumbnail: stats?.thumbnail ?? undefined,
      postCount: stats?.postCount ?? 0,
      distance: dist,
    })

    // 지도 이동
    if (mapInstanceRef.current) {
      mapInstanceRef.current.panTo({ lat: place.lat, lng: place.lng })
      mapInstanceRef.current.setZoom(15)
    }

    // 시트 접기
    setSnappedTop(87)
    setSearchQuery('')
    setSelectedPlace(null) // 이전 카드 숨기기
  }, [placeStats, userPos])

  // 마커 클릭 핸들러 (placeId로 place 찾아서 처리)
  const handleMarkerClick = useCallback((placeId: string) => {
    const place = places.find(p => p.id === placeId)
    if (place) {
      handlePlaceClick(place)
    }
  }, [places, handlePlaceClick])

  // 마커 클릭 핸들러를 모듈 레벨 변수에 저장 (캐시된 마커도 접근 가능)
  useEffect(() => {
    markerClickHandler = handleMarkerClick
    return () => {
      markerClickHandler = null
    }
  }, [handleMarkerClick])

  // 배너에서 상세 페이지로 이동
  const handleBannerClick = useCallback(() => {
    if (!bannerPlace) return
    if (bannerPlace.type === 'registered') {
      navigate(`/spots/${bannerPlace.id}`)
    } else {
      // 미등록 장소 - 쿼리 파라미터로 정보 전달
      const params = new URLSearchParams({
        name: bannerPlace.name,
        address: bannerPlace.address,
        lat: String(bannerPlace.lat),
        lng: String(bannerPlace.lng),
      })
      navigate(`/spots/unregistered?${params}`)
    }
  }, [bannerPlace, navigate])

  // 배너 닫기
  const closeBanner = useCallback(() => {
    setBannerPlace(null)
    // 임시 마커 제거
    if (tempMarkerRef.current) {
      tempMarkerRef.current.map = null
      tempMarkerRef.current = null
    }
  }, [])

  const handleRegionChange = useCallback((r: 'domestic' | 'international') => {
    setRegion(r)
    setCountryFilter(null)
    setCountrySearch('')
    setSearchQuery('')
    setSelectedPlace(null)
    setListSort(r === 'domestic' ? 'nearest' : 'popular')
  }, [])

  const handleCountryClick = useCallback((country: string) => {
    setCountryFilter(country)
    setCountrySearch('')
    setListSort('popular')
  }, [])

  const handleClearCountry = useCallback(() => {
    setCountryFilter(null)
  }, [])

  const expandToHalf = useCallback(() => {
    setSnappedTop((prev) => (prev > 50 ? 50 : prev))
  }, [])

  const handleLocateMe = useCallback(() => {
    if (!navigator.geolocation) {
      toast.error('이 브라우저에서는 위치 기능을 지원하지 않습니다.')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        setUserPos({ lat, lng })

        const map = mapInstanceRef.current
        if (map) {
          map.panTo({ lat, lng })
          map.setZoom(14)
        }

        // 파란색 점 마커 표시/업데이트
        if (userLocationMarkerRef.current) {
          userLocationMarkerRef.current.position = { lat, lng }
          if (map) userLocationMarkerRef.current.map = map
        } else if (map) {
          const dot = document.createElement('div')
          dot.style.cssText =
            'width:18px;height:18px;background:#EA580C;border:3px solid #fff;border-radius:50%;box-shadow:0 0 0 1px rgba(0,0,0,0.1),0 1px 4px rgba(0,0,0,0.3);'
          const marker = new google.maps.marker.AdvancedMarkerElement({
            position: { lat, lng },
            map,
            content: dot,
            zIndex: 9999,
          })
          userLocationMarkerRef.current = marker
        }
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          toast.error('위치 권한이 필요합니다.')
        } else {
          toast.error('현재 위치를 가져올 수 없습니다.')
        }
      },
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }, [])

  /* ── 드래그 핸들러 — 모든 위치 계산은 px 단위, DOM 직접 조작 ── */

  // 1) 드래그 시작: transition 제거, will-change 활성화, 스크롤 비활성화
  const onDragStart = useCallback((clientY: number) => {
    dragRef.current = {
      startY: clientY,
      startTopPx: currentTopRef.current,
      dragging: true,
    }
    const el = sheetRef.current
    if (el) {
      el.style.transition = 'none'
      el.style.willChange = 'transform'
      el.style.maxHeight = `${window.innerHeight}px`
    }
    // 드래그 중 목록 스크롤 비활성화 → 터치 이벤트 충돌 방지
    if (listRef.current) listRef.current.style.overflowY = 'hidden'
  }, [])

  // 2) rAF 콜백: 실제 DOM transform 적용 (프레임당 최대 1회)
  const applyDragTransform = useCallback(() => {
    const dy = pendingYRef.current - dragRef.current.startY
    const vh = window.innerHeight
    const maxTop = vh * 0.8
    const newTop = Math.max(0, Math.min(maxTop, dragRef.current.startTopPx + dy))
    currentTopRef.current = newTop
    const el = sheetRef.current
    if (el) el.style.transform = `translateY(${newTop}px)`
    rafRef.current = 0
  }, [])

  // 3) 드래그 이동: rAF throttle → 프레임 동기화
  const onDragMove = useCallback((clientY: number) => {
    if (!dragRef.current.dragging) return
    pendingYRef.current = clientY
    if (!rafRef.current) {
      rafRef.current = requestAnimationFrame(applyDragTransform)
    }
  }, [applyDragTransform])

  // 4) 드래그 종료: 스냅 + will-change 해제 + 스크롤 복원
  const onDragEnd = useCallback(() => {
    // 보류 중인 rAF 플러시
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = 0
      applyDragTransform()
    }
    dragRef.current.dragging = false

    // 현재 위치(px) → 보이는 비율 계산
    const topPx = currentTopRef.current
    const vh = window.innerHeight
    const visiblePct = ((vh - topPx) / vh) * 100

    // 가장 가까운 스냅 포인트 결정
    let snapPx: number
    let snapState: number

    if (topPx <= 50 || visiblePct > 75) {
      snapPx = 0
      snapState = 0
    } else if (visiblePct >= 35) {
      snapPx = vh * 0.5
      snapState = 50
    } else {
      snapPx = vh * 0.87
      snapState = 87
    }

    // 부드러운 transition 후 스냅
    const el = sheetRef.current
    if (el) {
      el.style.transition = 'transform 0.3s ease-out, max-height 0.3s ease-out'
      el.style.transform = `translateY(${snapPx}px)`
      el.style.maxHeight = `${window.innerHeight - snapPx}px`
      // transition 종료 후 will-change 해제 → 메모리 반환
      const onEnd = () => {
        el.style.willChange = ''
        el.removeEventListener('transitionend', onEnd)
      }
      el.addEventListener('transitionend', onEnd)
    }
    currentTopRef.current = snapPx

    // 목록 스크롤 복원
    if (listRef.current) listRef.current.style.overflowY = 'auto'

    // React는 값이 동일하면 리렌더링 생략
    setSnappedTop(snapState)
  }, [applyDragTransform])

  // 5) window 레벨 이벤트 → 핸들 밖으로 나가도 동작, 모든 리스너에 passive: true
  const handleProps = useMemo(() => ({
    onTouchStart: (e: React.TouchEvent) => {
      onDragStart(e.touches[0].clientY)
      const onMove = (ev: TouchEvent) => onDragMove(ev.touches[0].clientY)
      const onUp = () => {
        onDragEnd()
        window.removeEventListener('touchmove', onMove)
        window.removeEventListener('touchend', onUp)
      }
      window.addEventListener('touchmove', onMove, { passive: true })
      window.addEventListener('touchend', onUp, { passive: true })
    },
    onMouseDown: (e: React.MouseEvent) => {
      onDragStart(e.clientY)
      const onMove = (ev: MouseEvent) => onDragMove(ev.clientY)
      const onUp = () => {
        onDragEnd()
        window.removeEventListener('mousemove', onMove)
        window.removeEventListener('mouseup', onUp)
      }
      window.addEventListener('mousemove', onMove, { passive: true })
      window.addEventListener('mouseup', onUp, { passive: true })
    },
  }), [onDragStart, onDragMove, onDragEnd])

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* 지도 로딩 스켈레톤 */}
      {!mapReady && (
        <div className="absolute inset-0 z-30 bg-gray-100 flex flex-col items-center justify-center">
          <div className="relative">
            {/* 지도 스켈레톤 배경 */}
            <div className="w-64 h-64 bg-gray-200 rounded-xl overflow-hidden relative">
              {/* 격자 라인 */}
              <div className="absolute inset-0 grid grid-cols-4 gap-px">
                {[...Array(16)].map((_, i) => (
                  <div key={i} className="bg-gray-100/50" />
                ))}
              </div>
              {/* 가운데 로딩 인디케이터 */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-16 h-16 bg-white rounded-full shadow-lg flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                </div>
              </div>
            </div>
          </div>
          <p className="mt-4 text-sm text-gray-500 font-medium">지도 로딩 중...</p>
          <p className="mt-1 text-xs text-gray-400">잠시만 기다려주세요</p>
        </div>
      )}

      {/* 지도 — 부모 컨테이너 꽉 채움 */}
      <div
        ref={mapRef}
        className="absolute inset-0"
      />

      {/* 국내/해외 토글 */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 flex bg-white rounded-full shadow-md overflow-hidden">
        <button
          type="button"
          onClick={() => handleRegionChange('domestic')}
          className={`px-5 py-2 text-sm font-medium transition-colors ${
            region === 'domestic'
              ? 'bg-blue-600 text-white'
              : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          국내
        </button>
        <button
          type="button"
          onClick={() => handleRegionChange('international')}
          className={`px-5 py-2 text-sm font-medium transition-colors ${
            region === 'international'
              ? 'bg-blue-600 text-white'
              : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          해외
        </button>
      </div>

      {/* 나의 위치 버튼 */}
      <button
        type="button"
        onClick={handleLocateMe}
        className="absolute top-3 right-3 z-10 w-10 h-10 bg-white rounded-full shadow-md flex items-center justify-center hover:bg-gray-50 active:bg-gray-100"
        aria-label="나의 위치"
      >
        <Crosshair className="w-5 h-5 text-orange-600" />
      </button>

      {/* 장소 카드 (마커 클릭, peek 상태에서만) */}
      {selectedPlace &&
        sheetState === 'peek' &&
        (() => {
          const st = placeStats.get(selectedPlace.id)
          return (
            <div
              className="absolute left-0 right-0 z-10 p-4"
              style={{ bottom: `${100 - snappedTop + 1}%` }}
            >
              <div className="bg-white rounded-2xl shadow-lg p-4 flex gap-3">
                {st?.thumbnail ? (
                  <img
                    src={st.thumbnail}
                    alt={selectedPlace.name}
                    loading="lazy"
                    decoding="async"
                    className="w-20 h-20 rounded-xl object-cover shrink-0"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                    <MapPin className="w-6 h-6 text-gray-300" />
                  </div>
                )}
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <button
                    type="button"
                    onClick={() => navigate(`/spots/${selectedPlace.id}`)}
                    className="text-left"
                  >
                    <div className="flex items-center gap-1">
                      <h2 className="text-base font-bold text-gray-900">
                        {selectedPlace.name}
                      </h2>
                      <FavoriteButton
                        placeId={selectedPlace.id}
                        favorited={isFavorited(selectedPlace.id)}
                        onToggle={toggleFavorite}
                        size="md"
                      />
                    </div>
                    <div className="flex gap-3 mt-1.5 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5" />글{' '}
                        {st?.postCount ?? 0}개
                      </span>
                      <span className="flex items-center gap-1">
                        <ThumbsUp className="w-3.5 h-3.5" />
                        추천 {st?.likesSum ?? 0}개
                      </span>
                    </div>
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    share(
                      selectedPlace.name,
                      `${window.location.origin}/spots/${selectedPlace.id}`,
                    )
                  }
                  className="p-1.5 text-gray-400 self-start"
                >
                  <Share2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          )
        })()}

      {/* ── 하단 시트 — absolute overlay, transform으로 이동 ── */}
      <div
        ref={sheetRef}
        className={`absolute inset-0 z-20 bg-white shadow-xl flex flex-col ${
          snappedTop > 5 ? 'rounded-t-2xl' : ''
        }`}
        style={sheetStyle}
      >
        {/* 드래그 핸들 — touch-action: none으로 브라우저 제스처 차단 */}
        <div
          className="shrink-0 flex justify-center py-3 cursor-grab active:cursor-grabbing"
          style={{ touchAction: 'none' }}
          {...handleProps}
        >
          <div className="w-10 h-1 rounded-full bg-gray-300" />
        </div>

        {/* 해외 모드: 나라 필터 태그 — 항상 표시 */}
        {region === 'international' && countryFilter && (
          <div className="shrink-0 px-4 pb-2">
            <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
              {countryFilter}
              <button type="button" onClick={handleClearCountry} className="ml-0.5 hover:text-blue-900">
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          </div>
        )}

        {/* 해외 모드: 나라 검색 — 항상 표시 (peek 포함) */}
        {region === 'international' && !countryFilter && (
          <div className="shrink-0 px-4 pb-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={countrySearch}
                onChange={(e) => setCountrySearch(e.target.value)}
                onFocus={expandToHalf}
                placeholder="나라 검색 (한글/영어)"
                className="w-full pl-9 pr-3 py-2 bg-gray-100 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        )}

        {/* 국내 모드: 출사지 검색 — 항상 표시 (peek 포함) */}
        {region === 'domestic' && (
          <div className="shrink-0 px-4 pb-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={expandToHalf}
                placeholder="출사지 검색"
                className="w-full pl-9 pr-3 py-2 bg-gray-100 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        )}

        {/* peek 상태에서는 목록/결과 숨김 */}
        {sheetState !== 'peek' && (
          isCountrySearching ? (
            <div ref={listRef} className="flex-1 overflow-y-auto">
              {filteredCountries.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">
                  &quot;{countrySearch}&quot; 검색 결과 없음
                </p>
              ) : (
                filteredCountries.map((country) => {
                  const cs = countryStats.get(country)
                  return (
                    <button
                      key={country}
                      type="button"
                      onClick={() => handleCountryClick(country)}
                      className="w-full flex items-center gap-3 px-4 py-3 border-b border-gray-100 text-left hover:bg-gray-50"
                    >
                      <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                        <MapPin className="w-5 h-5 text-blue-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-gray-900">{country}</span>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-400">
                          <span>출사지 {cs?.placeCount ?? 0}개</span>
                          <span>·</span>
                          <span>글 {cs?.postCount ?? 0}개</span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
                    </button>
                  )
                })
              )}
            </div>
          ) : (
            <>
              {/* 해외 모드: 인기 국가 버튼 */}
              {region === 'international' && !countryFilter && (
                <div className="shrink-0 flex items-center gap-2 px-4 pb-2">
                  {POPULAR_COUNTRIES.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => handleCountryClick(c)}
                      className="px-3 py-1.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 whitespace-nowrap"
                    >
                      {c}
                    </button>
                  ))}
                </div>
              )}

              {/* 정렬 · 필터 */}
              <div className="shrink-0 flex items-center gap-2 px-4 pb-2">
                {region === 'international' && countryFilter ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setListSort('popular')}
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        listSort === 'popular'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      인기순
                    </button>
                    <button
                      type="button"
                      onClick={() => setListSort('newest')}
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        listSort === 'newest'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      최신순
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setListSort('nearest')}
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        listSort === 'nearest'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      가까운순
                    </button>
                    <button
                      type="button"
                      onClick={() => setListSort('newest')}
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        listSort === 'newest'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      최신순
                    </button>
                    <button
                      type="button"
                      onClick={() => setListSort('popular')}
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        listSort === 'popular'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      인기순
                    </button>
                  </>
                )}
              </div>

              {/* 장소 목록 */}
              <div ref={listRef} className="flex-1 overflow-y-auto">
                {displayedPlaces.length === 0 ? (
                  <>
                    {/* Google Places 검색 결과 */}
                    {region === 'domestic' && searchQuery.trim() && (
                      <>
                        {searchingGoogle ? (
                          <p className="text-sm text-gray-400 text-center py-8">
                            검색 중...
                          </p>
                        ) : googlePlaces.length > 0 ? (
                          <>
                            <p className="text-xs text-gray-500 px-4 py-2 bg-gray-50">
                              Google 검색 결과 (등록되지 않은 장소)
                            </p>
                            {googlePlaces.map((gp, idx) => (
                              <button
                                key={gp.id || idx}
                                type="button"
                                onClick={() => handleGooglePlaceClick(gp)}
                                className="w-full flex items-center gap-3 px-4 py-3 border-b border-gray-100 text-left hover:bg-gray-50"
                              >
                                <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center shrink-0">
                                  <MapPin className="w-5 h-5 text-orange-500" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <span className="text-sm font-medium text-gray-900 line-clamp-1">
                                    {gp.displayName}
                                  </span>
                                  <p className="text-xs text-gray-400 line-clamp-1 mt-0.5">
                                    {gp.formattedAddress}
                                  </p>
                                </div>
                                <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
                              </button>
                            ))}
                          </>
                        ) : (
                          <p className="text-sm text-gray-400 text-center py-8">
                            "{searchQuery}" 검색 결과가 없습니다.
                          </p>
                        )}
                      </>
                    )}
                    {/* 검색어 없을 때 기본 메시지 */}
                    {(!searchQuery.trim() || region === 'international') && (
                      <p className="text-sm text-gray-400 text-center py-8">
                        {region === 'international'
                          ? '해외 출사지가 없습니다.'
                          : '등록된 장소가 없습니다.'}
                      </p>
                    )}
                  </>
                ) : (
                  displayedPlaces.map((place) => (
                    <PlaceItem
                      key={place.id}
                      place={place}
                      stats={placeStats.get(place.id)}
                      onSelect={handlePlaceClick}
                    />
                  ))
                )}
              </div>
            </>
          )
        )}
      </div>

      {/* 하단 장소 배너 */}
      {bannerPlace && (
        <div className="absolute bottom-0 left-0 right-0 z-30 p-4 pb-6">
          <div
            className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden cursor-pointer"
            onClick={handleBannerClick}
          >
            <div className="flex items-center gap-3 p-3">
              {/* 썸네일 */}
              {bannerPlace.thumbnail ? (
                <img
                  src={bannerPlace.thumbnail}
                  alt={bannerPlace.name}
                  className="w-16 h-16 rounded-xl object-cover shrink-0"
                />
              ) : (
                <div className={`w-16 h-16 rounded-xl flex items-center justify-center shrink-0 ${
                  bannerPlace.type === 'registered' ? 'bg-blue-50' : 'bg-orange-50'
                }`}>
                  <MapPin className={`w-6 h-6 ${
                    bannerPlace.type === 'registered' ? 'text-blue-500' : 'text-orange-500'
                  }`} />
                </div>
              )}
              {/* 정보 */}
              <div className="flex-1 min-w-0">
                <p className="text-base font-semibold text-gray-900 truncate">
                  {bannerPlace.name}
                </p>
                <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                  {bannerPlace.distance !== undefined && (
                    <>
                      <span className="flex items-center gap-0.5">
                        <MapPin className="w-3.5 h-3.5" />
                        {formatDistance(bannerPlace.distance)}
                      </span>
                      <span>·</span>
                    </>
                  )}
                  <span className="flex items-center gap-0.5">
                    <FileText className="w-3.5 h-3.5" />
                    {bannerPlace.type === 'registered'
                      ? `글 ${bannerPlace.postCount ?? 0}개`
                      : '등록된 글 없음'}
                  </span>
                </div>
              </div>
              {/* 닫기 버튼 */}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); closeBanner() }}
                className="p-2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
