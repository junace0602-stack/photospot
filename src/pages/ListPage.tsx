import { useState, useEffect, useLayoutEffect, useMemo, useRef, useCallback, memo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ThumbsUp,
  MessageCircle,
  Pencil,
  Camera,
  X,
  Trophy,
  Search,
  Loader2,
  Bell,
  MapPin,
  Eye,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { displayName } from '../lib/displayName'
import { useBlockedUsers } from '../hooks/useBlockedUsers'

/* ── 타입 ─────────────────────────────────────────── */

interface CommunityPost {
  id: string
  user_id: string
  author_nickname: string
  section: string
  title: string
  content: string
  thumbnail_url: string | null
  image_urls: string[]
  price: number | null
  sold: boolean
  likes_count: number
  comment_count: number
  view_count: number
  is_anonymous: boolean
  created_at: string
  event_id: string | null
}

interface Event {
  id: string
  user_id: string
  author_nickname: string
  title: string
  topic: string
  description: string
  thumbnail_url: string | null
  prize: string
  start_date: string
  end_date: string
  is_official: boolean
  status: string
  result_announced: boolean
  entries_count: number
  created_at: string
}

/** 통합 목록 아이템 */
interface ListItem {
  id: string
  user_id: string
  kind: 'spot' | 'community'
  section: string
  title: string
  content: string
  author_nickname: string
  is_anonymous: boolean
  created_at: string
  likes_count: number
  comment_count: number
  view_count: number
  thumbnail_url: string | null
  imageUrls: string[]
  spotName: string
  place_id: string
  price: number | null
  eventName?: string
  eventId?: string
}

/* ── 상수 ─────────────────────────────────────────── */

const SECTIONS = ['전체', '일반', '사진', '질문', '챌린지'] as const
type Section = (typeof SECTIONS)[number]

const SORT_OPTIONS = ['최신순', '인기글'] as const
type SortOption = (typeof SORT_OPTIONS)[number]

const PAGE_SIZE = 20

/* ── 유틸 ─────────────────────────────────────────── */

function relativeTime(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return '방금 전'
  if (mins < 60) return `${mins}분 전`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}시간 전`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}일 전`
  return new Date(dateStr).toLocaleDateString('ko-KR')
}

function getEventStatus(event: Event): { label: string; color: string } {
  if (event.result_announced) return { label: '결과발표', color: 'bg-blue-50 text-blue-600' }
  const now = new Date()
  const start = new Date(event.start_date)
  const end = new Date(event.end_date)
  end.setHours(23, 59, 59, 999)
  if (now < start) return { label: '예정', color: 'bg-yellow-100 text-yellow-700' }
  if (now <= end) return { label: '진행중', color: 'bg-green-100 text-green-700' }
  return { label: '마감', color: 'bg-blue-50 text-blue-600' }
}

/* ── 이미지 화질 최적화 URL 생성 ───────────────────────────────────── */

/**
 * Supabase Storage 이미지 URL에 quality 파라미터 추가
 * - 그리드용 저화질 이미지 로드 (quality: 50)
 */
function getLowQualityImageUrl(url: string, quality: number = 50): string {
  if (!url) return url

  // Supabase Storage URL인지 확인
  if (!url.includes('/storage/v1/object/public/')) {
    return url
  }

  // object → render/image 로 변경하고 quality 파라미터 추가
  const transformedUrl = url.replace(
    '/storage/v1/object/public/',
    '/storage/v1/render/image/public/'
  )

  const separator = transformedUrl.includes('?') ? '&' : '?'
  return `${transformedUrl}${separator}quality=${quality}`
}

/* ── Lazy Image ───────────────────────────────────── */

function LazyImage({
  src,
  alt = '',
  className,
  style,
  onClick,
  draggable,
}: {
  src: string
  alt?: string
  className?: string
  style?: React.CSSProperties
  onClick?: React.MouseEventHandler
  draggable?: boolean
}) {
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      className={className}
      style={style}
      onClick={onClick}
      draggable={draggable}
    />
  )
}

/* ── 포토 그리드 (메모이제이션) ──────────────────────────────────── */

const PhotoGrid = memo(function PhotoGrid({ urls, onPhotoClick }: { urls: string[]; onPhotoClick?: (index: number) => void }) {
  if (urls.length === 0) return null

  // 그리드용 저화질 URL (quality: 50)
  const lowQualityUrls = useMemo(() => urls.map(u => getLowQualityImageUrl(u, 50)), [urls])

  const click = (i: number) => (e: React.MouseEvent) => {
    e.stopPropagation()
    onPhotoClick?.(i)
  }

  if (urls.length === 1) {
    return (
      <div className="rounded-xl overflow-hidden cursor-pointer" onClick={click(0)}>
        <LazyImage src={lowQualityUrls[0]} className="w-full max-h-80 object-cover" />
      </div>
    )
  }

  if (urls.length === 2) {
    return (
      <div className="grid grid-cols-2 gap-0.5 rounded-xl overflow-hidden">
        {lowQualityUrls.map((u, i) => (
          <LazyImage key={i} src={u} className="w-full h-48 object-cover cursor-pointer" onClick={click(i)} />
        ))}
      </div>
    )
  }

  if (urls.length === 3) {
    return (
      <div className="grid grid-cols-2 gap-0.5 rounded-xl overflow-hidden" style={{ height: 240 }}>
        <LazyImage src={lowQualityUrls[0]} className="w-full h-full object-cover cursor-pointer" style={{ gridRow: '1/3' }} onClick={click(0)} />
        <LazyImage src={lowQualityUrls[1]} className="w-full object-cover cursor-pointer" style={{ height: 119 }} onClick={click(1)} />
        <LazyImage src={lowQualityUrls[2]} className="w-full object-cover cursor-pointer" style={{ height: 119 }} onClick={click(2)} />
      </div>
    )
  }

  // 4+
  const show = lowQualityUrls.slice(0, 4)
  const extra = urls.length - 4
  return (
    <div className="grid grid-cols-2 gap-0.5 rounded-xl overflow-hidden">
      {show.map((u, i) => (
        <div key={i} className="relative cursor-pointer" onClick={click(i)}>
          <LazyImage src={u} className="w-full h-32 object-cover" />
          {i === 3 && extra > 0 && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center pointer-events-none">
              <span className="text-white text-lg font-bold">+{extra}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  )
})

/* ── 라이트박스 (메모이제이션) ────────────────────────────────────── */

const Lightbox = memo(function Lightbox({
  urls,
  initialIndex,
  onClose,
}: {
  urls: string[]
  initialIndex: number
  onClose: () => void
}) {
  const [idx, setIdx] = useState(initialIndex)
  const touchRef = useRef({ startX: 0, startY: 0 })

  const prev = useCallback(() => setIdx((i) => (i > 0 ? i - 1 : i)), [])
  const next = useCallback(() => setIdx((i) => (i < urls.length - 1 ? i + 1 : i)), [urls.length])

  // 키보드
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') prev()
      if (e.key === 'ArrowRight') next()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose, prev, next])

  const onTouchStart = (e: React.TouchEvent) => {
    touchRef.current = { startX: e.touches[0].clientX, startY: e.touches[0].clientY }
  }
  const onTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchRef.current.startX
    const dy = e.changedTouches[0].clientY - touchRef.current.startY
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) {
      if (dx < 0) next()
      else prev()
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/95 flex flex-col"
      onClick={onClose}
    >
      {/* 상단 바 */}
      <div className="shrink-0 flex items-center justify-between px-4 py-3" onClick={(e) => e.stopPropagation()}>
        <span className="text-white text-sm font-medium">
          {idx + 1} / {urls.length}
        </span>
        <button type="button" onClick={onClose} className="p-1 text-white">
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* 이미지 */}
      <div
        className="flex-1 flex items-center justify-center px-4 min-h-0"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <img
          src={urls[idx]}
          alt=""
          className="max-w-full max-h-full object-contain select-none"
          draggable={false}
          onClick={(e) => e.stopPropagation()}
        />
      </div>

      {/* 하단 여백 (터치 시 닫기) */}
      <div className="shrink-0 h-12" />
    </div>
  )
})

/* ── 메인 컴포넌트 ────────────────────────────────── */

export default function ListPage() {
  const navigate = useNavigate()
  const { loggedIn, isAdminMode, user } = useAuth()
  const { isBlocked } = useBlockedUsers()

  /* URL 검색 파라미터로 탭 복원 (브라우저 뒤로가기 시 자동 유지) */
  const [section, setSection] = useState<Section>(() => {
    const p = new URLSearchParams(window.location.search)
    return (p.get('tab') as Section) || '전체'
  })
  const [sort, setSort] = useState<SortOption>('최신순')
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [lightbox, setLightbox] = useState<{ urls: string[]; index: number } | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)

  const scrollRef = useRef<HTMLDivElement>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)

  /* ── 무한 스크롤 상태 ── */
  const [items, setItems] = useState<ListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const offsetRef = useRef(0)

  /* ── 이벤트 (챌린지) ── */
  const [events, setEvents] = useState<Event[]>([])
  const [eventsLoaded, setEventsLoaded] = useState(false)
  const eventNameMapRef = useRef(new Map<string, string>())

  /* 탭이 바뀔 때마다 URL에 반영 */
  useEffect(() => {
    const params = new URLSearchParams()
    params.set('tab', section)
    window.history.replaceState(window.history.state, '', `${window.location.pathname}?${params}`)
  }, [section])

  /* 읽지 않은 알림 수 */
  useEffect(() => {
    if (!loggedIn) {
      setUnreadCount(0)
      return
    }
    supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user?.id ?? '')
      .eq('is_read', false)
      .then(({ count }) => setUnreadCount(count ?? 0))
  }, [loggedIn, user?.id])

  /* 검색어 디바운스 (300ms) */
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  /* 네비게이션 직전에 스크롤 위치 저장 */
  const saveScrollBeforeNav = useCallback(() => {
    if (scrollRef.current) {
      sessionStorage.setItem('list-scroll', String(scrollRef.current.scrollTop))
    }
  }, [])

  /* ── 이벤트 로드 (캐싱 적용) ── */
  useEffect(() => {
    // sessionStorage 캐시 확인 (5분)
    const cached = sessionStorage.getItem('events-cache')
    const cachedTime = sessionStorage.getItem('events-cache-time')
    const cacheValid = cached && cachedTime && (Date.now() - Number(cachedTime)) < 5 * 60 * 1000

    if (cacheValid) {
      try {
        const data = JSON.parse(cached) as Event[]
        setEvents(data)
        const map = new Map<string, string>()
        for (const e of data) map.set(e.id, e.title)
        eventNameMapRef.current = map
        setEventsLoaded(true)
        return
      } catch {
        // 캐시 파싱 실패 시 새로 로드
      }
    }

    supabase
      .from('events')
      .select('*')
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data) {
          setEvents(data as Event[])
          const map = new Map<string, string>()
          for (const e of data) map.set(e.id, e.title)
          eventNameMapRef.current = map
          // 캐시 저장
          sessionStorage.setItem('events-cache', JSON.stringify(data))
          sessionStorage.setItem('events-cache-time', String(Date.now()))
        }
        setEventsLoaded(true)
      })
  }, [])

  /* ── 서버 사이드 쿼리 빌더 ── */
  const buildQuery = useCallback((from: number, to: number) => {
    let query = supabase
      .from('community_posts')
      .select('id, user_id, author_nickname, section, title, content, thumbnail_url, image_urls, price, sold, likes_count, comment_count, view_count, is_anonymous, created_at, event_id')
      .order('created_at', { ascending: false })

    // 섹션 필터
    if (section !== '전체' && section !== '챌린지') {
      query = query.eq('section', section)
    }

    // 인기글 필터
    if (sort === '인기글') {
      query = query.gte('likes_count', 3)
    }

    // 검색 필터
    if (debouncedSearch) {
      query = query.or(`title.ilike.%${debouncedSearch}%,content.ilike.%${debouncedSearch}%`)
    }

    return query.range(from, to)
  }, [section, sort, debouncedSearch])

  /* CommunityPost → ListItem 변환 */
  const toListItem = useCallback((p: CommunityPost): ListItem => ({
    id: p.id,
    user_id: p.user_id,
    kind: 'community',
    section: p.section,
    title: p.title,
    content: p.content,
    author_nickname: p.author_nickname,
    is_anonymous: p.is_anonymous,
    created_at: p.created_at,
    likes_count: p.likes_count,
    comment_count: p.comment_count,
    view_count: p.view_count ?? 0,
    thumbnail_url: p.thumbnail_url,
    imageUrls: p.image_urls ?? [],
    spotName: '',
    place_id: '',
    price: p.price,
    eventId: p.event_id ?? undefined,
    eventName: p.event_id ? eventNameMapRef.current.get(p.event_id) ?? '챌린지' : undefined,
  }), [])

  /* ── 초기 로드 + 필터/정렬/검색 변경 시 리셋 ── */
  useEffect(() => {
    if (section === '챌린지') {
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setItems([])
    setHasMore(true)
    offsetRef.current = 0

    buildQuery(0, PAGE_SIZE - 1).then(({ data }) => {
      if (cancelled) return
      const posts = (data ?? []) as CommunityPost[]
      const mapped = posts.map(toListItem).filter((i) => !isBlocked(i.user_id))
      setItems(mapped)
      setHasMore(posts.length === PAGE_SIZE)
      offsetRef.current = posts.length
      setLoading(false)
    })

    return () => { cancelled = true }
  }, [section, sort, debouncedSearch, buildQuery, toListItem, isBlocked])

  /* ── 스크롤 복원 ── */
  const scrollRestoredRef = useRef(false)
  useLayoutEffect(() => {
    if (!loading && !scrollRestoredRef.current) {
      scrollRestoredRef.current = true
      const saved = Number(sessionStorage.getItem('list-scroll')) || 0
      if (saved > 0 && scrollRef.current) {
        scrollRef.current.scrollTop = saved
      }
    }
  }, [loading])

  /* ── 추가 로드 (무한 스크롤) ── */
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || section === '챌린지') return
    setLoadingMore(true)

    const from = offsetRef.current
    const to = from + PAGE_SIZE - 1

    const { data } = await buildQuery(from, to)
    const posts = (data ?? []) as CommunityPost[]
    const mapped = posts.map(toListItem).filter((i) => !isBlocked(i.user_id))

    setItems((prev) => {
      // 중복 방지
      const existingIds = new Set(prev.map((i) => i.id))
      const newItems = mapped.filter((i) => !existingIds.has(i.id))
      return [...prev, ...newItems]
    })
    setHasMore(posts.length === PAGE_SIZE)
    offsetRef.current = from + posts.length
    setLoadingMore(false)
  }, [loadingMore, hasMore, section, buildQuery, toListItem, isBlocked])

  /* ── IntersectionObserver (스크롤 감지) ── */
  useEffect(() => {
    const sentinel = sentinelRef.current
    const container = scrollRef.current
    if (!sentinel || !container) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore()
        }
      },
      { root: container, rootMargin: '200px' },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [loadMore])

  /* ── 필터/정렬 변경 시 스크롤 리셋 ── */
  const resetScroll = useCallback(() => {
    sessionStorage.removeItem('list-scroll')
    scrollRestoredRef.current = true // 복원 방지
    if (scrollRef.current) scrollRef.current.scrollTop = 0
  }, [])

  const isPhoto = section === '사진'
  const isEvent = section === '챌린지'
  const [showEndedEvents, setShowEndedEvents] = useState(false)

  /* 이벤트 목록: 진행중/종료 분리 + 공식 상단 고정 */
  const { ongoingEvents, endedEvents } = useMemo(() => {
    const now = new Date()
    const ongoing: Event[] = []
    const ended: Event[] = []
    for (const e of events) {
      const endDate = new Date(e.end_date)
      endDate.setHours(23, 59, 59, 999)
      if (endDate >= now) ongoing.push(e)
      else ended.push(e)
    }
    const sortFn = (list: Event[]) => {
      const official = list.filter((e) => e.is_official)
      const userEv = list.filter((e) => !e.is_official)
      return [...official, ...userEv]
    }
    return { ongoingEvents: sortFn(ongoing), endedEvents: sortFn(ended) }
  }, [events])

  const displayedEvents = showEndedEvents ? endedEvents : ongoingEvents

  /* ── 렌더 ───────────────────────────────────────── */

  return (
    <div className="relative flex flex-col h-full bg-gray-50">
      {/* 앱 헤더 */}
      <header className="shrink-0 flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100">
        <div className="flex items-center gap-2">
          <MapPin className="w-6 h-6 text-blue-600" />
          <h1 className="text-lg font-bold text-gray-900">출사지도</h1>
        </div>
        <button
          type="button"
          onClick={() => navigate('/notifications')}
          className="relative p-2 -mr-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <Bell className="w-6 h-6 text-gray-700" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full" />
          )}
        </button>
      </header>

      {/* 검색창 */}
      <div className="shrink-0 px-4 py-3 bg-white">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="글 검색..."
            className="w-full pl-10 pr-9 py-2.5 bg-gray-100 rounded-[8px] text-sm outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 placeholder:text-gray-400 transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* 섹션 탭 */}
      <div className="shrink-0 bg-white border-b border-gray-200">
        <div className="flex">
          {SECTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                setSection(s)
                resetScroll()
              }}
              className={`flex-1 py-3 text-sm font-semibold ${
                section === s
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* 정렬 (이벤트 탭에선 숨김) */}
      {!isEvent && (
        <div className="shrink-0 flex gap-2 px-4 py-2 bg-white border-b border-gray-200">
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => { setSort(opt); resetScroll() }}
              className={`px-3 py-1 rounded-full text-xs font-medium ${
                sort === opt ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-600'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      )}

      {/* 본문 */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {loading || (!eventsLoaded && isEvent) ? (
          <div className="flex items-center justify-center h-40 text-sm text-gray-400">
            불러오는 중...
          </div>
        ) : isEvent ? (
          /* ── 이벤트 탭 ── */
          <div>
            {/* 진행중/종료 토글 */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-white border-b border-gray-100">
              <span className="text-sm font-bold text-gray-800">
                {showEndedEvents ? '종료된 챌린지' : '진행 중인 챌린지'}
              </span>
              <button
                type="button"
                onClick={() => setShowEndedEvents((v) => !v)}
                className="text-xs font-medium text-blue-600 px-3 py-1.5 rounded-full bg-blue-50"
              >
                {showEndedEvents ? '진행 중인 챌린지' : '종료된 챌린지'}
              </button>
            </div>
            {displayedEvents.length === 0 ? (
              <div className="flex items-center justify-center h-40 text-sm text-gray-400">
                {showEndedEvents ? '종료된 챌린지가 없습니다.' : '진행 중인 챌린지가 없습니다.'}
              </div>
            ) : (
            <div className="space-y-3 p-4">
              {displayedEvents.map((ev) => {
                const st = getEventStatus(ev)
                return (
                  <button
                    key={ev.id}
                    type="button"
                    onClick={() => { saveScrollBeforeNav(); navigate(`/events/${ev.id}`) }}
                    className="w-full bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden text-left"
                  >
                    {ev.thumbnail_url && (
                      <LazyImage src={ev.thumbnail_url} className="w-full h-40 object-cover" />
                    )}
                    <div className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${st.color}`}>
                          {st.label}
                        </span>
                        {ev.is_official && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                            공식
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-bold text-gray-900 line-clamp-1">{ev.title}</p>
                      <p className="text-xs text-gray-500 mt-1">{ev.topic}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                        <span>
                          {new Date(ev.start_date).toLocaleDateString('ko-KR')} ~ {new Date(ev.end_date).toLocaleDateString('ko-KR')}
                        </span>
                        <span>|</span>
                        <span className="flex items-center gap-0.5">
                          <Trophy className="w-3 h-3" />
                          {ev.prize}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">참여 {ev.entries_count}명</p>
                    </div>
                  </button>
                )
              })}
            </div>
            )}
          </div>
        ) : items.length === 0 ? (
          <div className="flex items-center justify-center h-40 text-sm text-gray-400">
            글이 없습니다.
          </div>
        ) : isPhoto ? (
          /* ── 사진 탭: 카드형 ── */
          <div className="space-y-3 p-4">
            {items.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden cursor-pointer"
                onClick={() => { saveScrollBeforeNav(); navigate(`/community/${item.id}`) }}
              >
                {/* 프로필 헤더 */}
                <div className="flex items-center gap-2.5 px-4 pt-3 pb-2">
                  <div className="w-8 h-8 rounded-full bg-gray-200 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-semibold text-gray-900">{displayName(item.author_nickname, item.is_anonymous, isAdminMode)}</span>
                    <span className="ml-2 text-xs text-gray-400">{relativeTime(item.created_at)}</span>
                  </div>
                </div>
                {/* 이벤트 태그 + 제목 */}
                <div className="px-4 pb-2">
                  {item.eventName && (
                    <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-600 mb-1">
                      {item.eventName} 챌린지
                    </span>
                  )}
                  <p className="text-sm text-gray-900 font-medium line-clamp-2">{item.title}</p>
                </div>
                {/* 사진 그리드 */}
                {item.imageUrls.length > 0 && (
                  <div className="px-4 pb-2">
                    <PhotoGrid
                      urls={item.imageUrls}
                      onPhotoClick={(i) => setLightbox({ urls: item.imageUrls, index: i })}
                    />
                  </div>
                )}
                {/* 하단 */}
                <div className="flex items-center gap-4 px-4 py-2.5 border-t border-gray-50 text-xs text-gray-400">
                  <span className="flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5" />
                    {item.view_count}
                  </span>
                  <span className="flex items-center gap-1">
                    <ThumbsUp className="w-3.5 h-3.5" />
                    {item.likes_count}
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageCircle className="w-3.5 h-3.5" />
                    {item.comment_count}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* ── 기본 목록형 (디시인사이드 스타일) ── */
          <div className="bg-white">
            {items.map((item) => {
              const hasImage = item.thumbnail_url || item.imageUrls.length > 0

              return (
                <Link key={item.id} to={`/community/${item.id}`} className="block" onClick={saveScrollBeforeNav}>
                  <div className="flex items-start gap-2 px-4 py-2.5 border-b border-gray-100">
                    {/* 콘텐츠 영역: 좌우 분산 */}
                    <div className="flex-1 min-w-0 flex justify-between gap-2">
                      {/* 왼쪽: 제목+뱃지, 닉네임 */}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-gray-900 font-medium line-clamp-1">
                          {item.eventName && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-600 mr-1.5">
                              {item.eventName}
                            </span>
                          )}
                          {item.title}
                          {item.comment_count > 0 && (
                            <span className="ml-1 text-blue-500 font-medium">
                              [{item.comment_count}]
                            </span>
                          )}
                          {/* 사진 있으면 아이콘 표시 */}
                          {hasImage && (
                            <Camera className="inline-block w-3.5 h-3.5 ml-1 text-gray-400" />
                          )}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1 text-xs text-gray-400">
                          {item.price != null && (
                            <>
                              <span className="text-orange-500 font-medium">{item.price.toLocaleString()}원</span>
                              <span>·</span>
                            </>
                          )}
                          <span>{displayName(item.author_nickname, item.is_anonymous, isAdminMode)}</span>
                        </div>
                      </div>
                      {/* 오른쪽: 시간, 조회수+추천수 */}
                      <div className="shrink-0 flex flex-col items-end text-xs text-gray-400">
                        <span>{relativeTime(item.created_at)}</span>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="flex items-center gap-0.5">
                            <Eye className="w-3 h-3" />
                            {item.view_count}
                          </span>
                          <span className="flex items-center gap-0.5">
                            <ThumbsUp className="w-3 h-3" />
                            {item.likes_count}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}

        {/* 무한 스크롤 센티넬 + 로딩 표시 */}
        {!isEvent && !loading && (
          <div ref={sentinelRef} className="py-4">
            {loadingMore && (
              <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                로딩 중...
              </div>
            )}
            {!hasMore && items.length > 0 && (
              <p className="text-center text-xs text-gray-300 py-2">
                모든 글을 불러왔습니다.
              </p>
            )}
          </div>
        )}
      </div>

      {/* 글쓰기 */}
      {loggedIn && (
        <button
          type="button"
          onClick={() => navigate(isEvent ? '/events/new' : '/posts/new')}
          className="absolute bottom-6 right-4 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center z-10"
        >
          <Pencil className="w-6 h-6" />
        </button>
      )}

      {/* 라이트박스 */}
      {lightbox && (
        <Lightbox
          urls={lightbox.urls}
          initialIndex={lightbox.index}
          onClose={() => setLightbox(null)}
        />
      )}
    </div>
  )
}
