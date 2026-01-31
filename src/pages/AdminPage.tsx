import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Check,
  X,
  Trash2,
  Search,
  UserMinus,
  Trophy,
  RotateCcw,
  EyeOff,
  ChevronLeft,
  Users,
  UserCheck,
  Calendar,
  UserPlus2,
  FileText,
  PenLine,
  Crown,
  Gift,
  ImagePlus,
  Activity,
  TrendingUp,
  Tag,
  MapPin,
  Clock,
  BarChart3,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { uploadImage, IMAGE_ACCEPT } from '../lib/imageUpload'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { applyPenalty, removePenalty, getPenaltyHistory, penaltyTypeToKorean, PENALTY_OPTIONS, type UserPenalty, type PenaltyType } from '../lib/penalty'

// ── 통계 탭 ──

interface DashboardStats {
  totalUsers: number
  todayActiveUsers: number
  weekActiveUsers: number
  monthNewUsers: number
  totalPosts: number
  todayPosts: number
  currentActiveUsers: number
}

interface TagStat {
  tag: string
  count: number
}

interface SpotStat {
  place_id: string
  place_name: string
  post_count: number
}

interface HourlyData {
  hour: number
  count: number
}

interface DailySignup {
  date: string
  count: number
}

// 간단한 막대 차트 컴포넌트
function SimpleBarChart({ data, maxValue, label }: { data: { label: string; value: number }[]; maxValue: number; label: string }) {
  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold text-gray-600 mb-3">{label}</h4>
      {data.map((item, idx) => (
        <div key={idx} className="flex items-center gap-2">
          <span className="text-[10px] text-gray-500 w-14 truncate shrink-0">{item.label}</span>
          <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-500"
              style={{ width: `${maxValue > 0 ? (item.value / maxValue) * 100 : 0}%` }}
            />
          </div>
          <span className="text-[10px] text-gray-600 font-medium w-8 text-right">{item.value}</span>
        </div>
      ))}
    </div>
  )
}

// 시간대별 막대 차트 (24시간)
function HourlyChart({ data, label }: { data: HourlyData[]; label: string }) {
  const maxValue = Math.max(...data.map(d => d.count), 1)

  return (
    <div>
      <h4 className="text-xs font-semibold text-gray-600 mb-3">{label}</h4>
      <div className="flex items-end gap-[2px] h-20">
        {data.map((item) => (
          <div key={item.hour} className="flex-1 flex flex-col items-center">
            <div
              className="w-full bg-blue-400 rounded-t transition-all duration-500"
              style={{ height: `${maxValue > 0 ? (item.count / maxValue) * 100 : 0}%`, minHeight: item.count > 0 ? '2px' : '0' }}
            />
          </div>
        ))}
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-[9px] text-gray-400">0시</span>
        <span className="text-[9px] text-gray-400">6시</span>
        <span className="text-[9px] text-gray-400">12시</span>
        <span className="text-[9px] text-gray-400">18시</span>
        <span className="text-[9px] text-gray-400">24시</span>
      </div>
    </div>
  )
}

// 일별 가입 추이 라인 차트
function DailySignupChart({ data }: { data: DailySignup[] }) {
  const maxValue = Math.max(...data.map(d => d.count), 1)

  return (
    <div>
      <h4 className="text-xs font-semibold text-gray-600 mb-3">최근 7일 가입자 추이</h4>
      <div className="flex items-end gap-1 h-16">
        {data.map((item, idx) => (
          <div key={idx} className="flex-1 flex flex-col items-center">
            <span className="text-[9px] text-gray-500 mb-1">{item.count}</span>
            <div
              className="w-full bg-green-400 rounded-t transition-all duration-500"
              style={{ height: `${maxValue > 0 ? (item.count / maxValue) * 100 : 0}%`, minHeight: item.count > 0 ? '4px' : '2px' }}
            />
            <span className="text-[8px] text-gray-400 mt-1">{item.date.slice(5)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function StatsTab() {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    todayActiveUsers: 0,
    weekActiveUsers: 0,
    monthNewUsers: 0,
    totalPosts: 0,
    todayPosts: 0,
    currentActiveUsers: 0,
  })
  const [loading, setLoading] = useState(true)
  const [popularTags, setPopularTags] = useState<TagStat[]>([])
  const [popularSpots, setPopularSpots] = useState<SpotStat[]>([])
  const [hourlyPosts, setHourlyPosts] = useState<HourlyData[]>([])
  const [hourlyActivity, setHourlyActivity] = useState<HourlyData[]>([])
  const [dailySignups, setDailySignups] = useState<DailySignup[]>([])

  useEffect(() => {
    const loadStats = async () => {
      const now = new Date()
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
      const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7).toISOString()
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
      const fifteenMinAgo = new Date(now.getTime() - 15 * 60 * 1000).toISOString()

      // 기본 통계
      const [
        totalUsersRes,
        todayActiveRes,
        weekActiveRes,
        monthNewRes,
        communityPostsRes,
        spotPostsRes,
        todayCommunityRes,
        todaySpotRes,
        currentActiveRes,
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('last_active_at', todayStart),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('last_active_at', weekStart),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', monthStart),
        supabase.from('community_posts').select('*', { count: 'exact', head: true }),
        supabase.from('posts').select('*', { count: 'exact', head: true }),
        supabase.from('community_posts').select('*', { count: 'exact', head: true }).gte('created_at', todayStart),
        supabase.from('posts').select('*', { count: 'exact', head: true }).gte('created_at', todayStart),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('last_active_at', fifteenMinAgo),
      ])

      setStats({
        totalUsers: totalUsersRes.count ?? 0,
        todayActiveUsers: todayActiveRes.count ?? 0,
        weekActiveUsers: weekActiveRes.count ?? 0,
        monthNewUsers: monthNewRes.count ?? 0,
        totalPosts: (communityPostsRes.count ?? 0) + (spotPostsRes.count ?? 0),
        todayPosts: (todayCommunityRes.count ?? 0) + (todaySpotRes.count ?? 0),
        currentActiveUsers: currentActiveRes.count ?? 0,
      })

      // 인기 태그 TOP 10
      const { data: postsWithTags } = await supabase
        .from('posts')
        .select('tags')
        .not('tags', 'is', null)

      if (postsWithTags) {
        const tagCounts: Record<string, number> = {}
        for (const post of postsWithTags) {
          const tags = post.tags as string[] | null
          if (tags && Array.isArray(tags)) {
            for (const tag of tags) {
              tagCounts[tag] = (tagCounts[tag] ?? 0) + 1
            }
          }
        }
        const sortedTags = Object.entries(tagCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([tag, count]) => ({ tag, count }))
        setPopularTags(sortedTags)
      }

      // 인기 출사지 TOP 10 (글 수 기준)
      const { data: postsWithPlace } = await supabase
        .from('posts')
        .select('place_id, places(name)')

      if (postsWithPlace) {
        // place_id별 글 수 집계
        const placeCountMap = new Map<string, { name: string; count: number }>()
        for (const post of postsWithPlace) {
          const placeId = post.place_id
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const placeData = post.places as any
          const placeName = placeData?.name ?? '알 수 없음'
          const existing = placeCountMap.get(placeId)
          if (existing) {
            existing.count++
          } else {
            placeCountMap.set(placeId, { name: placeName, count: 1 })
          }
        }
        // 글 수 많은 순 정렬 후 TOP 10
        const sortedSpots = Array.from(placeCountMap.entries())
          .sort((a, b) => b[1].count - a[1].count)
          .slice(0, 10)
          .map(([placeId, data]) => ({
            place_id: placeId,
            place_name: data.name,
            post_count: data.count,
          }))
        setPopularSpots(sortedSpots)
      }

      // 시간대별 글 작성 (오늘)
      const { data: todayPosts } = await supabase
        .from('posts')
        .select('created_at')
        .gte('created_at', todayStart)

      const { data: todayCommunityPosts } = await supabase
        .from('community_posts')
        .select('created_at')
        .gte('created_at', todayStart)

      const hourlyPostsData: HourlyData[] = Array.from({ length: 24 }, (_, i) => ({ hour: i, count: 0 }))
      const allTodayPosts = [...(todayPosts ?? []), ...(todayCommunityPosts ?? [])]
      for (const post of allTodayPosts) {
        const hour = new Date(post.created_at).getHours()
        hourlyPostsData[hour].count++
      }
      setHourlyPosts(hourlyPostsData)

      // 시간대별 활동량 (오늘 last_active_at 기준)
      const { data: activeProfiles } = await supabase
        .from('profiles')
        .select('last_active_at')
        .gte('last_active_at', todayStart)

      const hourlyActivityData: HourlyData[] = Array.from({ length: 24 }, (_, i) => ({ hour: i, count: 0 }))
      if (activeProfiles) {
        for (const profile of activeProfiles) {
          if (profile.last_active_at) {
            const hour = new Date(profile.last_active_at).getHours()
            hourlyActivityData[hour].count++
          }
        }
      }
      setHourlyActivity(hourlyActivityData)

      // 일별 가입 추이 (최근 7일)
      const dailyData: DailySignup[] = []
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)
        const dateStr = date.toISOString().slice(0, 10)
        const nextDate = new Date(date.getTime() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

        const { count } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', dateStr)
          .lt('created_at', nextDate)

        dailyData.push({ date: dateStr, count: count ?? 0 })
      }
      setDailySignups(dailyData)

      setLoading(false)
    }

    loadStats()
  }, [])

  const statCards = [
    { label: '총 가입자', value: stats.totalUsers, unit: '명', icon: Users, color: 'bg-blue-500' },
    { label: '오늘 방문', value: stats.todayActiveUsers, unit: '명', icon: UserCheck, color: 'bg-green-500' },
    { label: '주간 방문', value: stats.weekActiveUsers, unit: '명', icon: Calendar, color: 'bg-purple-500' },
    { label: '월 신규가입', value: stats.monthNewUsers, unit: '명', icon: UserPlus2, color: 'bg-orange-500' },
    { label: '총 글', value: stats.totalPosts, unit: '개', icon: FileText, color: 'bg-indigo-500' },
    { label: '오늘 글', value: stats.todayPosts, unit: '개', icon: PenLine, color: 'bg-pink-500' },
    { label: '현재 활동', value: stats.currentActiveUsers, unit: '명', icon: Activity, color: 'bg-teal-500' },
  ]

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <div className="grid grid-cols-3 gap-2">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl p-3 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-16 mb-2" />
              <div className="h-6 bg-gray-200 rounded w-12" />
            </div>
          ))}
        </div>
        <div className="bg-white rounded-xl p-4 animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-24 mb-4" />
          <div className="h-32 bg-gray-100 rounded" />
        </div>
      </div>
    )
  }

  const tagMax = Math.max(...popularTags.map(t => t.count), 1)
  const spotMax = Math.max(...popularSpots.map(s => s.post_count), 1)

  return (
    <div className="p-4 space-y-4">
      {/* 기본 통계 카드 */}
      <div className="grid grid-cols-3 gap-2">
        {statCards.map(({ label, value, unit, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl p-3 shadow-sm">
            <div className="flex items-center gap-1.5 mb-1">
              <div className={`w-6 h-6 ${color} rounded-lg flex items-center justify-center`}>
                <Icon className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-[11px] text-gray-500 font-medium">{label}</span>
            </div>
            <p className="text-lg font-bold text-gray-900">
              {value.toLocaleString()}
              <span className="text-xs font-normal text-gray-400 ml-0.5">{unit}</span>
            </p>
          </div>
        ))}
      </div>

      {/* 인기 태그 TOP 10 */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Tag className="w-4 h-4 text-blue-500" />
          <h3 className="text-sm font-bold text-gray-700">인기 태그 TOP 10</h3>
        </div>
        {popularTags.length > 0 ? (
          <SimpleBarChart
            data={popularTags.map(t => ({ label: t.tag, value: t.count }))}
            maxValue={tagMax}
            label=""
          />
        ) : (
          <p className="text-xs text-gray-400 text-center py-4">태그 데이터가 없습니다.</p>
        )}
      </div>

      {/* 인기 출사지 TOP 10 */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <MapPin className="w-4 h-4 text-red-500" />
          <h3 className="text-sm font-bold text-gray-700">인기 출사지 TOP 10</h3>
          <span className="text-[10px] text-gray-400">(글 수 기준)</span>
        </div>
        {popularSpots.length > 0 ? (
          <SimpleBarChart
            data={popularSpots.map(s => ({ label: s.place_name, value: s.post_count }))}
            maxValue={spotMax}
            label=""
          />
        ) : (
          <p className="text-xs text-gray-400 text-center py-4">출사지 데이터가 없습니다.</p>
        )}
      </div>

      {/* 시간대별 글 작성 */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Clock className="w-4 h-4 text-purple-500" />
          <h3 className="text-sm font-bold text-gray-700">오늘 시간대별 글 작성</h3>
        </div>
        <HourlyChart data={hourlyPosts} label="" />
      </div>

      {/* 시간대별 활동량 */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 className="w-4 h-4 text-green-500" />
          <h3 className="text-sm font-bold text-gray-700">오늘 시간대별 활동량</h3>
        </div>
        <HourlyChart data={hourlyActivity} label="" />
      </div>

      {/* 일별 가입 추이 */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-4 h-4 text-orange-500" />
          <h3 className="text-sm font-bold text-gray-700">일별 가입 추이</h3>
        </div>
        <DailySignupChart data={dailySignups} />
      </div>
    </div>
  )
}

// ── Types ──

interface DbReport {
  id: string
  target_type: string
  target_id: string
  reporter_id: string
  reason: string
  detail: string | null
  status: string
  created_at: string
}

interface ReporterInfo {
  reporter_id: string
  nickname: string
}

interface ReporterStat {
  reporter_id: string
  nickname: string
  total: number
  false_count: number
  valid_count: number
  false_report_count: number
}

interface ReportGroup {
  target_type: string
  target_id: string
  reasons: string[]
  count: number
  latest: string
  reporters: ReporterInfo[]
}

interface HiddenItem {
  id: string
  table: string
  title: string
  author_nickname: string
  created_at: string
  reportCount: number
}

interface SuspendedUser {
  id: string
  nickname: string
  suspended_until: string | null
  penalty_count: number
}

// ── Tab: 신고 관리 ──

function ReportsTab() {
  const [groups, setGroups] = useState<ReportGroup[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('reports')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })

      if (!data) { setLoading(false); return }

      const reports = data as DbReport[]

      // reporter_id 목록 수집 후 닉네임 일괄 조회
      const reporterIds = [...new Set(reports.map((r) => r.reporter_id))]
      const nicknameMap = new Map<string, string>()
      if (reporterIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, nickname')
          .in('id', reporterIds)
        if (profiles) {
          for (const p of profiles) nicknameMap.set(p.id, p.nickname)
        }
      }

      // target별 그룹핑
      const map = new Map<string, ReportGroup>()
      for (const r of reports) {
        const key = `${r.target_type}:${r.target_id}`
        const reporter: ReporterInfo = {
          reporter_id: r.reporter_id,
          nickname: nicknameMap.get(r.reporter_id) ?? r.reporter_id,
        }
        const g = map.get(key)
        if (g) {
          g.count++
          g.reasons.push(r.reason)
          if (r.created_at > g.latest) g.latest = r.created_at
          if (!g.reporters.some((rp) => rp.reporter_id === r.reporter_id)) {
            g.reporters.push(reporter)
          }
        } else {
          map.set(key, {
            target_type: r.target_type,
            target_id: r.target_id,
            reasons: [r.reason],
            count: 1,
            latest: r.created_at,
            reporters: [reporter],
          })
        }
      }
      setGroups(Array.from(map.values()).sort((a, b) => b.count - a.count))
      setLoading(false)
    }
    load()
  }, [])

  // 정상 처리 (글 문제없음 → 허위 신고)
  const markFalse = async (g: ReportGroup) => {
    // reports 상태를 'false'로 업데이트
    await supabase
      .from('reports')
      .update({ status: 'false' })
      .eq('target_type', g.target_type)
      .eq('target_id', g.target_id)
      .eq('status', 'pending')

    // 신고자들의 false_report_count 증가
    for (const reporter of g.reporters) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('false_report_count')
        .eq('id', reporter.reporter_id)
        .single()

      if (profile) {
        const newCount = (profile.false_report_count ?? 0) + 1
        await supabase
          .from('profiles')
          .update({ false_report_count: newCount })
          .eq('id', reporter.reporter_id)

        if (newCount >= 20) {
          toast(`${reporter.nickname} 유저가 허위 신고 ${newCount}회로 계정 정지 대상입니다.`)
        }
      }
    }

    setGroups((p) => p.filter((x) => !(x.target_type === g.target_type && x.target_id === g.target_id)))
    toast.success('정상 처리되었습니다. 신고자들의 허위 신고 횟수가 증가했습니다.')
  }

  // 숨김 (유효 신고)
  const hideTarget = async (g: ReportGroup) => {
    const table =
      g.target_type === 'community_post' ? 'community_posts'
        : g.target_type === 'post' ? 'posts'
        : g.target_type === 'community_comment' ? 'community_comments'
        : 'comments'

    // reports 상태를 'valid'로 업데이트
    await supabase
      .from('reports')
      .update({ status: 'valid' })
      .eq('target_type', g.target_type)
      .eq('target_id', g.target_id)
      .eq('status', 'pending')

    // 대상 콘텐츠 숨김
    await supabase.from(table).update({ hidden: true }).eq('id', g.target_id)

    toast.success('숨김 처리되었습니다.')
    setGroups((p) => p.filter((x) => !(x.target_type === g.target_type && x.target_id === g.target_id)))
  }

  const typeLabel = (t: string) =>
    t === 'community_post' ? '커뮤니티 글'
      : t === 'post' ? '출사지 글'
      : t === 'community_comment' ? '커뮤니티 댓글'
      : '출사지 댓글'

  if (loading) {
    return <div className="flex items-center justify-center h-40 text-sm text-gray-400">불러오는 중...</div>
  }

  return (
    <div className="p-4 space-y-3">
      {groups.map((g) => (
        <div key={`${g.target_type}:${g.target_id}`} className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2 py-0.5 bg-red-50 text-red-500 rounded-full text-xs font-medium">
              {typeLabel(g.target_type)}
            </span>
            <span className="text-xs text-gray-400">신고 {g.count}건</span>
            {g.count >= 3 && (
              <span className="px-2 py-0.5 bg-orange-50 text-orange-500 rounded-full text-xs font-medium">자동 숨김</span>
            )}
          </div>
          <p className="text-xs text-gray-500 mb-1">
            사유: {[...new Set(g.reasons)].join(', ')}
          </p>
          <p className="text-xs text-gray-400">
            최근 신고: {new Date(g.latest).toLocaleDateString('ko-KR')}
          </p>
          <div className="mt-2">
            <p className="text-xs text-gray-500">
              신고자: {g.reporters.map((r) => r.nickname).join(', ')}
            </p>
          </div>
          <div className="flex gap-2 mt-3">
            <button type="button" onClick={() => hideTarget(g)} className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg bg-red-50 text-red-500 text-sm font-medium">
              <EyeOff className="w-4 h-4" /> 숨김
            </button>
            <button type="button" onClick={() => markFalse(g)} className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm font-medium">
              <Check className="w-4 h-4" /> 정상 처리
            </button>
          </div>
        </div>
      ))}
      {groups.length === 0 && (
        <p className="text-center text-sm text-gray-400 py-10">신고 내역이 없습니다.</p>
      )}
    </div>
  )
}

// ── Tab: 숨김 관리 ──

function HiddenPostsTab() {
  const [items, setItems] = useState<HiddenItem[]>([])
  const [loading, setLoading] = useState(true)

  const loadHidden = async () => {
    setLoading(true)
    const [cpRes, pRes] = await Promise.all([
      supabase
        .from('community_posts')
        .select('id, title, author_nickname, created_at')
        .eq('hidden', true)
        .order('created_at', { ascending: false }),
      supabase
        .from('posts')
        .select('id, title, author_nickname, created_at')
        .eq('hidden', true)
        .order('created_at', { ascending: false }),
    ])

    const result: HiddenItem[] = []

    if (cpRes.data) {
      for (const p of cpRes.data) {
        const { count } = await supabase
          .from('reports')
          .select('*', { count: 'exact', head: true })
          .eq('target_type', 'community_post')
          .eq('target_id', p.id)
        result.push({ ...p, table: 'community_posts', reportCount: count ?? 0 })
      }
    }
    if (pRes.data) {
      for (const p of pRes.data) {
        const { count } = await supabase
          .from('reports')
          .select('*', { count: 'exact', head: true })
          .eq('target_type', 'post')
          .eq('target_id', p.id)
        result.push({ ...p, table: 'posts', reportCount: count ?? 0 })
      }
    }

    setItems(result)
    setLoading(false)
  }

  useEffect(() => { loadHidden() }, [])

  const restore = async (item: HiddenItem) => {
    await supabase.from(item.table).update({ hidden: false }).eq('id', item.id)
    setItems((p) => p.filter((i) => i.id !== item.id))
    toast.success('복구되었습니다.')
  }

  const remove = async (item: HiddenItem) => {
    if (!confirm('정말 삭제하시겠습니까? 이 작업은 취소할 수 없습니다.')) return

    // 관련 신고 삭제
    const targetType = item.table === 'community_posts' ? 'community_post' : 'post'
    await supabase.from('reports').delete().eq('target_type', targetType).eq('target_id', item.id)

    // 관련 댓글/좋아요 삭제
    if (item.table === 'community_posts') {
      await supabase.from('community_comments').delete().eq('community_post_id', item.id)
      await supabase.from('community_likes').delete().eq('community_post_id', item.id)
    } else {
      await supabase.from('comments').delete().eq('post_id', item.id)
      await supabase.from('likes').delete().eq('post_id', item.id)
    }

    await supabase.from(item.table).delete().eq('id', item.id)
    setItems((p) => p.filter((i) => i.id !== item.id))
    toast.success('삭제되었습니다.')
  }

  if (loading) {
    return <div className="flex items-center justify-center h-40 text-sm text-gray-400">불러오는 중...</div>
  }

  return (
    <div className="p-4 space-y-3">
      {items.map((item) => (
        <div key={item.id} className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
              {item.table === 'community_posts' ? '커뮤니티' : '출사지'}
            </span>
            <span className="text-xs text-red-400">신고 {item.reportCount}건</span>
          </div>
          <p className="text-sm font-medium text-gray-900 line-clamp-1">{item.title}</p>
          <p className="text-xs text-gray-400 mt-1">
            {item.author_nickname} · {new Date(item.created_at).toLocaleDateString('ko-KR')}
          </p>
          <div className="flex gap-2 mt-3">
            <button type="button" onClick={() => restore(item)} className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg bg-blue-50 text-blue-600 text-sm font-medium">
              <RotateCcw className="w-4 h-4" /> 복구
            </button>
            <button type="button" onClick={() => remove(item)} className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg bg-red-50 text-red-500 text-sm font-medium">
              <Trash2 className="w-4 h-4" /> 삭제
            </button>
          </div>
        </div>
      ))}
      {items.length === 0 && (
        <p className="text-center text-sm text-gray-400 py-10">숨김 처리된 글이 없습니다.</p>
      )}
    </div>
  )
}

// ── Tab: 유저 제재 ──

function BanTab() {
  const { user } = useAuth()
  const [suspendedUsers, setSuspendedUsers] = useState<SuspendedUser[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState<{ id: string; nickname: string }[]>([])
  const [selectedUser, setSelectedUser] = useState<{ id: string; nickname: string } | null>(null)
  const [selectedPenaltyType, setSelectedPenaltyType] = useState<PenaltyType>('warning')
  const [banReason, setBanReason] = useState('')
  const [applying, setApplying] = useState(false)
  const [historyModal, setHistoryModal] = useState<{ userId: string; nickname: string } | null>(null)
  const [penaltyHistory, setPenaltyHistory] = useState<UserPenalty[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)

  // 정지된 유저 목록 로드
  const loadSuspendedUsers = async () => {
    setLoading(true)
    const now = new Date().toISOString()
    const { data } = await supabase
      .from('profiles')
      .select('id, nickname, suspended_until, penalty_count')
      .or(`suspended_until.gt.${now},suspended_until.eq.9999-12-31T23:59:59+00:00`)
      .order('suspended_until', { ascending: false })

    if (data) setSuspendedUsers(data as SuspendedUser[])
    setLoading(false)
  }

  useEffect(() => { loadSuspendedUsers() }, [])

  // 유저 검색
  const searchUser = async () => {
    if (!query.trim()) {
      setSearchResults([])
      return
    }
    const { data } = await supabase
      .from('profiles')
      .select('id, nickname')
      .ilike('nickname', `%${query.trim()}%`)
      .limit(10)

    if (data) setSearchResults(data)
  }

  useEffect(() => {
    const timer = setTimeout(searchUser, 300)
    return () => clearTimeout(timer)
  }, [query])

  // 제재 적용
  const handleApplyPenalty = async () => {
    if (!selectedUser || !banReason.trim() || !user) return

    setApplying(true)
    const result = await applyPenalty(selectedUser.id, banReason.trim(), selectedPenaltyType, user.id)

    if (result.success) {
      toast.success(`${selectedUser.nickname}님에게 ${penaltyTypeToKorean(selectedPenaltyType)}가 적용되었습니다.`)
      setSelectedUser(null)
      setBanReason('')
      setQuery('')
      setSearchResults([])
      setSelectedPenaltyType('warning')
      loadSuspendedUsers()
    } else {
      toast.error(result.error ?? '제재 적용에 실패했습니다.')
    }
    setApplying(false)
  }

  // 제재 해제
  const handleRemovePenalty = async (userId: string, nickname: string) => {
    if (!confirm(`${nickname}님의 제재를 해제하시겠습니까?`)) return

    const success = await removePenalty(userId)
    if (success) {
      toast.success('제재가 해제되었습니다.')
      loadSuspendedUsers()
    } else {
      toast.error('제재 해제에 실패했습니다.')
    }
  }

  // 제재 이력 보기
  const openHistory = async (userId: string, nickname: string) => {
    setHistoryModal({ userId, nickname })
    setHistoryLoading(true)
    const history = await getPenaltyHistory(userId)
    setPenaltyHistory(history)
    setHistoryLoading(false)
  }

  // 정지 기간 표시
  const formatSuspension = (suspendedUntil: string | null): string => {
    if (!suspendedUntil) return '정상'
    const date = new Date(suspendedUntil)
    if (date.getFullYear() === 9999) return '영구 정지'
    return `${date.toLocaleDateString('ko-KR')}까지`
  }

  if (loading) {
    return <div className="flex items-center justify-center h-40 text-sm text-gray-400">불러오는 중...</div>
  }

  return (
    <>
      <div className="p-4 space-y-4">
        {/* 유저 검색 및 제재 */}
        <div className="bg-white rounded-xl p-4 shadow-sm space-y-3">
          <h3 className="text-sm font-bold text-gray-700">유저 제재</h3>
          <p className="text-xs text-gray-500">
            제재 유형과 기간을 선택하여 적용합니다.
          </p>

          <div className="relative">
            <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-2">
              <Search className="w-4 h-4 text-gray-400 shrink-0" />
              <input
                type="text"
                placeholder="닉네임으로 검색"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="flex-1 bg-transparent text-sm outline-none"
              />
            </div>

            {/* 검색 결과 드롭다운 */}
            {searchResults.length > 0 && !selectedUser && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-40 overflow-y-auto">
                {searchResults.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => {
                      setSelectedUser(u)
                      setQuery(u.nickname)
                      setSearchResults([])
                    }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                  >
                    {u.nickname}
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedUser && (
            <>
              <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-lg">
                <span className="text-sm text-blue-700">선택된 유저:</span>
                <span className="text-sm font-semibold text-blue-900">{selectedUser.nickname}</span>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedUser(null)
                    setQuery('')
                  }}
                  className="ml-auto"
                >
                  <X className="w-4 h-4 text-blue-400" />
                </button>
              </div>

              {/* 제재 유형 선택 */}
              <div>
                <p className="text-xs text-gray-500 mb-2">제재 유형</p>
                <select
                  value={selectedPenaltyType}
                  onChange={(e) => setSelectedPenaltyType(e.target.value as PenaltyType)}
                  className="w-full px-3 py-2.5 bg-gray-100 rounded-lg text-sm outline-none appearance-none cursor-pointer"
                >
                  {PENALTY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <textarea
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                placeholder="제재 사유를 입력해주세요 (스팸, 광고, 욕설 등)"
                className="w-full h-20 px-3 py-2.5 bg-gray-100 rounded-lg text-sm outline-none resize-none"
              />

              <button
                type="button"
                onClick={handleApplyPenalty}
                disabled={!banReason.trim() || applying}
                className={`w-full py-2.5 rounded-xl text-sm font-semibold ${
                  banReason.trim() && !applying ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-400'
                }`}
              >
                <UserMinus className="w-4 h-4 inline mr-1" />
                {applying ? '처리 중...' : `${penaltyTypeToKorean(selectedPenaltyType)} 적용`}
              </button>
            </>
          )}
        </div>

        {/* 제재 중인 유저 목록 */}
        <div>
          <h3 className="text-sm font-bold text-gray-700 mb-2">현재 제재 중인 유저</h3>
          {suspendedUsers.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-6">제재 중인 유저가 없습니다.</p>
          ) : (
            <div className="space-y-2">
              {suspendedUsers.map((u) => (
                <div key={u.id} className="bg-white rounded-xl px-4 py-3 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800">{u.nickname}</p>
                      <p className="text-xs text-gray-400">
                        {formatSuspension(u.suspended_until)} · 누적 {u.penalty_count}회
                      </p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${
                      u.suspended_until && new Date(u.suspended_until).getFullYear() === 9999
                        ? 'bg-red-100 text-red-600'
                        : 'bg-orange-100 text-orange-600'
                    }`}>
                      {u.suspended_until && new Date(u.suspended_until).getFullYear() === 9999
                        ? '영구 정지'
                        : `${u.penalty_count}차 정지`}
                    </span>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => openHistory(u.id, u.nickname)}
                      className="flex-1 py-1.5 rounded-lg bg-gray-100 text-gray-600 text-xs font-medium"
                    >
                      이력 보기
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemovePenalty(u.id, u.nickname)}
                      className="flex-1 py-1.5 rounded-lg bg-green-50 text-green-600 text-xs font-medium"
                    >
                      제재 해제
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 제재 이력 모달 */}
      {historyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setHistoryModal(null)} />
          <div className="relative w-[90%] max-w-sm max-h-[70vh] bg-white rounded-2xl flex flex-col">
            <div className="shrink-0 flex items-center justify-between p-4 border-b border-gray-200">
              <div>
                <h3 className="text-base font-bold text-gray-900">제재 이력</h3>
                <p className="text-xs text-gray-500">{historyModal.nickname}</p>
              </div>
              <button type="button" onClick={() => setHistoryModal(null)}>
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {historyLoading ? (
                <p className="text-center text-sm text-gray-400 py-6">불러오는 중...</p>
              ) : penaltyHistory.length === 0 ? (
                <p className="text-center text-sm text-gray-400 py-6">제재 이력이 없습니다.</p>
              ) : (
                <div className="space-y-3">
                  {penaltyHistory.map((p) => (
                    <div key={p.id} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                          p.penalty_type === 'permanent' ? 'bg-red-100 text-red-600'
                            : p.penalty_type === '7day' ? 'bg-orange-100 text-orange-600'
                            : 'bg-yellow-100 text-yellow-600'
                        }`}>
                          {penaltyTypeToKorean(p.penalty_type)}
                        </span>
                        <span className="text-[10px] text-gray-400">
                          {new Date(p.created_at).toLocaleDateString('ko-KR')}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700">{p.reason}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ── Tab: 이벤트 승인 ──

interface PendingEvent {
  id: string
  user_id: string
  author_nickname: string
  title: string
  topic: string
  description: string
  thumbnail_url: string | null
  has_prize: boolean
  prize: string | null
  prize_image_url: string | null
  start_date: string
  end_date: string
  is_official: boolean
  status: string
  result_announced: boolean
  entries_count: number
  created_at: string
  hidden?: boolean
}

interface ChallengePost {
  id: string
  user_id: string
  author_nickname: string
  title: string
  thumbnail_url: string | null
  likes_count: number
  is_anonymous: boolean
  created_at: string
}

// 우승자 선정 모달
function WinnerSelectModal({
  event,
  onClose,
  onConfirm,
}: {
  event: PendingEvent
  onClose: () => void
  onConfirm: () => void
}) {
  const [posts, setPosts] = useState<ChallengePost[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)

  useEffect(() => {
    const loadPosts = async () => {
      const { data } = await supabase
        .from('community_posts')
        .select('id, user_id, author_nickname, title, thumbnail_url, likes_count, is_anonymous, created_at')
        .eq('event_id', event.id)
        .order('likes_count', { ascending: false })

      if (data) setPosts(data as ChallengePost[])
      setLoading(false)
    }
    loadPosts()
  }, [event.id])

  const handleConfirm = async () => {
    if (!selectedPostId) return

    const selectedPost = posts.find(p => p.id === selectedPostId)
    if (!selectedPost) return

    setConfirming(true)

    // 1. challenge_winners에 저장
    const { error: winnerError } = await supabase.from('challenge_winners').insert({
      challenge_id: event.id,
      user_id: selectedPost.user_id,
      post_id: selectedPost.id,
    })

    if (winnerError) {
      toast.error('우승자 저장에 실패했습니다.')
      setConfirming(false)
      return
    }

    // 2. events 테이블 업데이트
    await supabase.from('events').update({
      result_announced: true,
      winner_id: selectedPost.user_id,
      winner_post_id: selectedPost.id,
    }).eq('id', event.id)

    // 3. 우승자에게 알림
    const prizeMessage = event.has_prize
      ? `상품 수령을 위해 연락처를 입력해주세요.`
      : ''

    await supabase.from('notifications').insert({
      user_id: selectedPost.user_id,
      type: 'winner',
      message: `축하합니다! "${event.title}" 챌린지에서 우승하셨습니다! ${prizeMessage}`,
      link: `/events/${event.id}`,
      metadata: JSON.stringify({
        challenge_id: event.id,
        has_prize: event.has_prize,
        prize: event.prize,
      }),
    })

    setConfirming(false)
    onConfirm()
  }

  const selectedPost = posts.find(p => p.id === selectedPostId)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-[95%] max-w-md max-h-[85vh] bg-white rounded-2xl flex flex-col overflow-hidden">
        {/* 헤더 */}
        <div className="shrink-0 flex items-center justify-between p-4 border-b border-gray-200">
          <div>
            <h3 className="text-base font-bold text-gray-900">우승자 선정</h3>
            <p className="text-xs text-gray-500 mt-0.5">{event.title}</p>
          </div>
          <button type="button" onClick={onClose} className="text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 참여작 목록 */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <p className="text-center text-sm text-gray-400 py-10">불러오는 중...</p>
          ) : posts.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-10">참여작이 없습니다.</p>
          ) : (
            <div className="space-y-2">
              {posts.map((post, index) => {
                const isSelected = selectedPostId === post.id
                const isTopLiked = index === 0 && event.is_official

                return (
                  <button
                    key={post.id}
                    type="button"
                    onClick={() => setSelectedPostId(post.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-100 bg-white hover:border-gray-200'
                    }`}
                  >
                    {/* 썸네일 */}
                    <div className="relative shrink-0">
                      {post.thumbnail_url ? (
                        <img src={post.thumbnail_url} alt="" loading="lazy" decoding="async" className="w-14 h-14 rounded-lg object-cover" />
                      ) : (
                        <div className="w-14 h-14 rounded-lg bg-gray-100 flex items-center justify-center">
                          <Trophy className="w-5 h-5 text-gray-300" />
                        </div>
                      )}
                      {isTopLiked && (
                        <div className="absolute -top-1 -left-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                          <span className="text-[10px] text-white font-bold">1</span>
                        </div>
                      )}
                    </div>

                    {/* 정보 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-semibold text-gray-900 truncate">{post.title}</p>
                        {isTopLiked && (
                          <span className="shrink-0 px-1.5 py-0.5 bg-blue-100 text-blue-600 text-[10px] font-medium rounded">
                            추천 1위
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {post.is_anonymous ? '익명' : post.author_nickname}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        추천 {post.likes_count}
                      </p>
                    </div>

                    {/* 체크 표시 */}
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      isSelected ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                    }`}>
                      {isSelected && <Check className="w-4 h-4 text-white" />}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* 푸터 */}
        <div className="shrink-0 p-4 border-t border-gray-200 bg-gray-50">
          {selectedPost && (
            <div className="mb-3 p-3 bg-white rounded-lg border border-gray-200">
              <p className="text-xs text-gray-500">선택된 우승자</p>
              <p className="text-sm font-semibold text-gray-900 mt-0.5">
                {selectedPost.is_anonymous ? '익명' : selectedPost.author_nickname}
              </p>
              <p className="text-xs text-gray-600 truncate">{selectedPost.title}</p>
            </div>
          )}
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!selectedPostId || confirming}
            className={`w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 ${
              selectedPostId && !confirming
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-400'
            }`}
          >
            <Crown className="w-4 h-4" />
            {confirming ? '처리 중...' : '우승자 확정'}
          </button>
        </div>
      </div>
    </div>
  )
}

// 챌린지 상태 계산
function getEventStatusInfo(ev: PendingEvent): { label: string; color: string; isEnded: boolean } {
  if (ev.result_announced) return { label: '결과발표', color: 'bg-purple-100 text-purple-700', isEnded: true }
  if (ev.hidden) return { label: '숨김', color: 'bg-red-100 text-red-700', isEnded: true }
  const now = new Date()
  const start = new Date(ev.start_date)
  const end = new Date(ev.end_date)
  end.setHours(23, 59, 59, 999)
  if (now < start) return { label: '예정', color: 'bg-yellow-100 text-yellow-700', isEnded: false }
  if (now <= end) return { label: '진행중', color: 'bg-green-100 text-green-700', isEnded: false }
  return { label: '마감', color: 'bg-gray-100 text-gray-600', isEnded: true }
}

function EventManageTab() {
  const [events, setEvents] = useState<PendingEvent[]>([])
  const [loadingEvents, setLoadingEvents] = useState(true)
  const [winnerSelectEvent, setWinnerSelectEvent] = useState<PendingEvent | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<PendingEvent | null>(null)

  const loadEvents = async () => {
    setLoadingEvents(true)
    const { data } = await supabase
      .from('events')
      .select('*')
      .order('created_at', { ascending: false })

    if (data) {
      // 진행 중인 챌린지가 위로, 종료된 챌린지가 아래로
      const eventsData = data as PendingEvent[]
      const sorted = eventsData.sort((a, b) => {
        const aStatus = getEventStatusInfo(a)
        const bStatus = getEventStatusInfo(b)

        // 진행중/예정은 위로, 종료/결과발표는 아래로
        if (!aStatus.isEnded && bStatus.isEnded) return -1
        if (aStatus.isEnded && !bStatus.isEnded) return 1

        // 같은 그룹 내에서는 created_at 기준 최신순
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      })
      setEvents(sorted)
    }
    setLoadingEvents(false)
  }

  useEffect(() => { loadEvents() }, [])

  // 챌린지 삭제
  const handleDelete = async () => {
    if (!deleteTarget) return

    // 관련 데이터 삭제
    await supabase.from('challenge_winners').delete().eq('challenge_id', deleteTarget.id)
    await supabase.from('community_posts').update({ event_id: null }).eq('event_id', deleteTarget.id)
    await supabase.from('reports').delete().eq('target_type', 'event').eq('target_id', deleteTarget.id)

    const { error } = await supabase.from('events').delete().eq('id', deleteTarget.id)

    if (error) {
      toast.error('삭제에 실패했습니다.')
      return
    }

    setEvents((prev) => prev.filter((e) => e.id !== deleteTarget.id))
    setDeleteTarget(null)
    toast.success('챌린지가 삭제되었습니다.')
  }

  // 숨김 해제
  const restoreEvent = async (ev: PendingEvent) => {
    await supabase.from('events').update({ hidden: false }).eq('id', ev.id)
    setEvents((prev) => prev.map((e) => e.id === ev.id ? { ...e, hidden: false } : e))
    toast.success('숨김이 해제되었습니다.')
  }

  const handleWinnerConfirmed = () => {
    if (winnerSelectEvent) {
      setEvents((prev) => prev.map((e) =>
        e.id === winnerSelectEvent.id ? { ...e, result_announced: true } : e
      ))
    }
    setWinnerSelectEvent(null)
    toast.success('우승자가 선정되었습니다!')
  }

  if (loadingEvents) {
    return (
      <div className="flex items-center justify-center h-40 text-sm text-gray-400">
        불러오는 중...
      </div>
    )
  }

  const ongoingEvents = events.filter((e) => !getEventStatusInfo(e).isEnded)
  const endedEvents = events.filter((e) => getEventStatusInfo(e).isEnded)

  return (
    <>
      <div className="p-4 space-y-3">
        {events.length === 0 && (
          <p className="text-center text-sm text-gray-400 py-10">챌린지가 없습니다.</p>
        )}

        {/* 진행 중인 챌린지 */}
        {ongoingEvents.length > 0 && (
          <>
            <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full" />
              진행 중 ({ongoingEvents.length})
            </h3>
            {ongoingEvents.map((ev) => {
              const status = getEventStatusInfo(ev)
              return (
                <div key={ev.id} className="bg-white rounded-xl p-4 shadow-sm">
                  <div className="flex gap-3">
                    {ev.thumbnail_url && (
                      <img src={ev.thumbnail_url} alt="" loading="lazy" decoding="async" className="w-16 h-16 rounded-lg object-cover shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${status.color}`}>
                          {status.label}
                        </span>
                        {ev.is_official && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-100 text-blue-700">
                            공식
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-bold text-gray-900 line-clamp-1">{ev.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{ev.topic}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {ev.author_nickname} · {new Date(ev.start_date).toLocaleDateString('ko-KR')} ~ {new Date(ev.end_date).toLocaleDateString('ko-KR')}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(ev)}
                      className="flex items-center justify-center gap-1 px-3 py-2 rounded-lg bg-red-50 text-red-500 text-xs font-medium"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      삭제
                    </button>
                  </div>
                </div>
              )
            })}
          </>
        )}

        {/* 종료된 챌린지 */}
        {endedEvents.length > 0 && (
          <>
            <h3 className="text-sm font-bold text-gray-700 mt-4 flex items-center gap-2">
              <span className="w-2 h-2 bg-gray-400 rounded-full" />
              종료됨 ({endedEvents.length})
            </h3>
            {endedEvents.map((ev) => {
              const status = getEventStatusInfo(ev)
              const isEnded = new Date() > new Date(ev.end_date + 'T23:59:59')

              return (
                <div key={ev.id} className={`bg-white rounded-xl p-4 shadow-sm ${ev.hidden ? 'opacity-60' : ''}`}>
                  <div className="flex gap-3">
                    {ev.thumbnail_url && (
                      <img src={ev.thumbnail_url} alt="" loading="lazy" decoding="async" className="w-16 h-16 rounded-lg object-cover shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${status.color}`}>
                          {status.label}
                        </span>
                        {ev.is_official && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-100 text-blue-700">
                            공식
                          </span>
                        )}
                        {ev.has_prize && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-orange-100 text-orange-700">
                            상품
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-bold text-gray-900 line-clamp-1">{ev.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {ev.author_nickname} · 참여 {ev.entries_count}명
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3 flex-wrap">
                    {/* 숨김 상태면 복구 버튼 */}
                    {ev.hidden && (
                      <button
                        type="button"
                        onClick={() => restoreEvent(ev)}
                        className="flex items-center justify-center gap-1 px-3 py-2 rounded-lg bg-blue-50 text-blue-600 text-xs font-medium"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        복구
                      </button>
                    )}
                    {/* 공식 챌린지 + 종료 + 우승자 미선정 → 우승자 선정 버튼 */}
                    {ev.is_official && isEnded && !ev.result_announced && !ev.hidden && (
                      <button
                        type="button"
                        onClick={() => setWinnerSelectEvent(ev)}
                        className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg bg-purple-600 text-white text-xs font-medium"
                      >
                        <Crown className="w-3.5 h-3.5" />
                        우승자 선정
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(ev)}
                      className="flex items-center justify-center gap-1 px-3 py-2 rounded-lg bg-red-50 text-red-500 text-xs font-medium"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      삭제
                    </button>
                  </div>
                </div>
              )
            })}
          </>
        )}
      </div>

      {/* 삭제 확인 모달 */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDeleteTarget(null)} />
          <div className="relative w-[90%] max-w-sm bg-white rounded-2xl p-5">
            <h3 className="text-base font-bold text-gray-900 mb-2">챌린지 삭제</h3>
            <p className="text-sm text-gray-600 mb-1">"{deleteTarget.title}"</p>
            <p className="text-xs text-gray-400 mb-4">
              이 챌린지를 삭제하시겠습니까? 관련 우승자 정보도 함께 삭제됩니다.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-gray-100 text-gray-600"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-red-500 text-white"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}

      {winnerSelectEvent && (
        <WinnerSelectModal
          event={winnerSelectEvent}
          onClose={() => setWinnerSelectEvent(null)}
          onConfirm={handleWinnerConfirmed}
        />
      )}
    </>
  )
}

// ── Tab: 건의 관리 ──

interface FeedbackItem {
  id: string
  user_id: string
  category: string
  content: string
  screenshot_url: string | null
  email: string | null
  is_read: boolean
  created_at: string
}

function FeedbackTab({ onUnreadCount }: { onUnreadCount: (n: number) => void }) {
  const [items, setItems] = useState<FeedbackItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [detail, setDetail] = useState<FeedbackItem | null>(null)

  const load = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('feedback')
      .select('*')
      .order('created_at', { ascending: false })
    const list = (data ?? []) as FeedbackItem[]
    setItems(list)
    onUnreadCount(list.filter((f) => !f.is_read).length)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const openDetail = async (item: FeedbackItem) => {
    setDetail(item)
    if (!item.is_read) {
      await supabase.from('feedback').update({ is_read: true }).eq('id', item.id)
      setItems((p) => p.map((f) => (f.id === item.id ? { ...f, is_read: true } : f)))
      onUnreadCount(items.filter((f) => !f.is_read && f.id !== item.id).length)
    }
  }

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    if (selected.size === items.length) setSelected(new Set())
    else setSelected(new Set(items.map((f) => f.id)))
  }

  const deleteSelected = async () => {
    if (selected.size === 0) return
    if (!confirm(`${selected.size}개 건의를 삭제하시겠습니까?`)) return
    for (const id of selected) {
      await supabase.from('feedback').delete().eq('id', id)
    }
    setItems((p) => {
      const next = p.filter((f) => !selected.has(f.id))
      onUnreadCount(next.filter((f) => !f.is_read).length)
      return next
    })
    setSelected(new Set())
  }

  const catColor = (cat: string) =>
    cat === '오류 제보' ? 'bg-red-50 text-red-500'
      : cat === '기능 건의' ? 'bg-blue-50 text-blue-500'
      : 'bg-gray-100 text-gray-600'

  if (loading) {
    return <div className="flex items-center justify-center h-40 text-sm text-gray-400">불러오는 중...</div>
  }

  // 상세 보기
  if (detail) {
    return (
      <div className="p-4">
        <button
          type="button"
          onClick={() => setDetail(null)}
          className="flex items-center gap-1 text-sm text-gray-500 mb-4"
        >
          <ChevronLeft className="w-4 h-4" /> 목록으로
        </button>
        <div className="bg-white rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${catColor(detail.category)}`}>
              {detail.category}
            </span>
            <span className="text-xs text-gray-400">
              {new Date(detail.created_at).toLocaleString('ko-KR')}
            </span>
          </div>
          <p className="text-sm text-gray-800 whitespace-pre-line leading-relaxed">{detail.content}</p>
          {detail.screenshot_url && (
            <img src={detail.screenshot_url} alt="스크린샷" className="w-full max-w-xs rounded-xl border border-gray-200" />
          )}
          {detail.email && (
            <p className="text-xs text-gray-500">
              연락 이메일: <span className="text-gray-700">{detail.email}</span>
            </p>
          )}
        </div>
      </div>
    )
  }

  // 목록 보기
  return (
    <div className="p-4 space-y-3">
      {items.length > 0 && (
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={selected.size === items.length && items.length > 0}
              onChange={toggleAll}
              className="w-4 h-4 rounded border-gray-300 text-blue-600"
            />
            전체 선택
          </label>
          {selected.size > 0 && (
            <button
              type="button"
              onClick={deleteSelected}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-50 text-red-500 text-xs font-medium"
            >
              <Trash2 className="w-3.5 h-3.5" /> {selected.size}개 삭제
            </button>
          )}
        </div>
      )}

      {items.map((f) => (
        <div
          key={f.id}
          className={`rounded-xl p-4 shadow-sm cursor-pointer transition-colors ${
            f.is_read ? 'bg-white' : 'bg-blue-50 border border-blue-100'
          }`}
          onClick={() => openDetail(f)}
        >
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={selected.has(f.id)}
              onChange={(e) => { e.stopPropagation(); toggleSelect(f.id) }}
              onClick={(e) => e.stopPropagation()}
              className="w-4 h-4 mt-0.5 rounded border-gray-300 text-blue-600 shrink-0"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${catColor(f.category)}`}>
                  {f.category}
                </span>
                {!f.is_read && (
                  <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                )}
                <span className="text-xs text-gray-400 ml-auto shrink-0">
                  {new Date(f.created_at).toLocaleDateString('ko-KR')}
                </span>
              </div>
              <p className={`text-sm line-clamp-2 ${f.is_read ? 'text-gray-600' : 'text-gray-900 font-semibold'}`}>
                {f.content}
              </p>
            </div>
          </div>
        </div>
      ))}

      {items.length === 0 && (
        <p className="text-center text-sm text-gray-400 py-10">건의 내역이 없습니다.</p>
      )}
    </div>
  )
}

// ── Tab: 신고자 관리 ──

function ReporterManageTab() {
  const [stats, setStats] = useState<ReporterStat[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedReporter, setSelectedReporter] = useState<ReporterStat | null>(null)
  const [reporterReports, setReporterReports] = useState<DbReport[]>([])
  const [detailLoading, setDetailLoading] = useState(false)

  useEffect(() => {
    const load = async () => {
      // 모든 reports 조회
      const { data: reports } = await supabase
        .from('reports')
        .select('*')
        .order('created_at', { ascending: false })

      if (!reports) { setLoading(false); return }

      // reporter_id별 그룹핑
      const reporterMap = new Map<string, { total: number; false_count: number; valid_count: number }>()
      for (const r of reports as DbReport[]) {
        const entry = reporterMap.get(r.reporter_id) ?? { total: 0, false_count: 0, valid_count: 0 }
        entry.total++
        if (r.status === 'false') entry.false_count++
        if (r.status === 'valid') entry.valid_count++
        reporterMap.set(r.reporter_id, entry)
      }

      // profiles에서 닉네임, false_report_count 조회
      const reporterIds = [...reporterMap.keys()]
      const nicknameMap = new Map<string, { nickname: string; false_report_count: number }>()
      if (reporterIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, nickname, false_report_count')
          .in('id', reporterIds)
        if (profiles) {
          for (const p of profiles) {
            nicknameMap.set(p.id, { nickname: p.nickname, false_report_count: p.false_report_count ?? 0 })
          }
        }
      }

      const result: ReporterStat[] = []
      for (const [reporterId, counts] of reporterMap) {
        const profile = nicknameMap.get(reporterId)
        result.push({
          reporter_id: reporterId,
          nickname: profile?.nickname ?? reporterId,
          total: counts.total,
          false_count: counts.false_count,
          valid_count: counts.valid_count,
          false_report_count: profile?.false_report_count ?? 0,
        })
      }

      // 허위 신고 많은 순 정렬
      result.sort((a, b) => b.false_report_count - a.false_report_count)
      setStats(result)
      setLoading(false)
    }
    load()
  }, [])

  const openDetail = async (reporter: ReporterStat) => {
    setSelectedReporter(reporter)
    setDetailLoading(true)
    const { data } = await supabase
      .from('reports')
      .select('*')
      .eq('reporter_id', reporter.reporter_id)
      .order('created_at', { ascending: false })
    setReporterReports((data ?? []) as DbReport[])
    setDetailLoading(false)
  }

  const statusBadge = (count: number) => {
    if (count >= 20) return <span className="px-2 py-0.5 bg-red-50 text-red-500 rounded-full text-xs font-medium">계정정지</span>
    if (count >= 10) return <span className="px-2 py-0.5 bg-orange-50 text-orange-500 rounded-full text-xs font-medium">신고정지</span>
    return <span className="px-2 py-0.5 bg-green-50 text-green-600 rounded-full text-xs font-medium">정상</span>
  }

  const reportStatusBadge = (status: string) => {
    if (status === 'valid') return <span className="px-2 py-0.5 bg-blue-50 text-blue-500 rounded-full text-xs font-medium">유효</span>
    if (status === 'false') return <span className="px-2 py-0.5 bg-red-50 text-red-500 rounded-full text-xs font-medium">허위</span>
    return <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full text-xs font-medium">대기</span>
  }

  const typeLabel = (t: string) =>
    t === 'community_post' ? '커뮤니티 글'
      : t === 'post' ? '출사지 글'
      : t === 'community_comment' ? '커뮤니티 댓글'
      : '출사지 댓글'

  if (loading) {
    return <div className="flex items-center justify-center h-40 text-sm text-gray-400">불러오는 중...</div>
  }

  // 상세 보기
  if (selectedReporter) {
    return (
      <div className="p-4">
        <button
          type="button"
          onClick={() => setSelectedReporter(null)}
          className="flex items-center gap-1 text-sm text-gray-500 mb-4"
        >
          <ChevronLeft className="w-4 h-4" /> 목록으로
        </button>
        <div className="bg-white rounded-xl p-4 shadow-sm mb-4">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <p className="text-sm font-bold text-gray-900">{selectedReporter.nickname}</p>
              <p className="text-xs text-gray-400 mt-1">
                총 신고 {selectedReporter.total} · 허위 {selectedReporter.false_count} · 유효 {selectedReporter.valid_count}
              </p>
            </div>
            {statusBadge(selectedReporter.false_report_count)}
          </div>
        </div>

        {detailLoading ? (
          <div className="flex items-center justify-center h-20 text-sm text-gray-400">불러오는 중...</div>
        ) : (
          <div className="space-y-2">
            {reporterReports.map((r) => (
              <div key={r.id} className="bg-white rounded-xl p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                    {typeLabel(r.target_type)}
                  </span>
                  {reportStatusBadge(r.status)}
                </div>
                <p className="text-xs text-gray-600 mt-1">사유: {r.reason}</p>
                {r.detail && <p className="text-xs text-gray-400 mt-0.5">{r.detail}</p>}
                <p className="text-xs text-gray-400 mt-1">
                  {new Date(r.created_at).toLocaleDateString('ko-KR')}
                </p>
              </div>
            ))}
            {reporterReports.length === 0 && (
              <p className="text-center text-sm text-gray-400 py-6">신고 내역이 없습니다.</p>
            )}
          </div>
        )}
      </div>
    )
  }

  // 목록 보기
  return (
    <div className="p-4 space-y-2">
      {stats.map((s) => (
        <div
          key={s.reporter_id}
          onClick={() => openDetail(s)}
          className="bg-white rounded-xl p-4 shadow-sm cursor-pointer hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800">{s.nickname}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                총 {s.total} · 허위 {s.false_count} · 유효 {s.valid_count}
              </p>
            </div>
            {statusBadge(s.false_report_count)}
          </div>
        </div>
      ))}
      {stats.length === 0 && (
        <p className="text-center text-sm text-gray-400 py-10">신고 이력이 있는 유저가 없습니다.</p>
      )}
    </div>
  )
}

// ── Tab: 우승자 관리 ──

interface WinnerItem {
  id: string
  challenge_id: string
  user_id: string
  post_id: string
  prize_sent: boolean
  created_at: string
  // joined
  challenge_title: string
  has_prize: boolean
  prize: string | null
  prize_image_url: string | null
  winner_nickname: string
  post_title: string
}

function WinnersTab() {
  const [winners, setWinners] = useState<WinnerItem[]>([])
  const [loading, setLoading] = useState(true)

  // 특정 유저에게 알림 보내기 모달
  const [notifyModal, setNotifyModal] = useState<{ winner: WinnerItem } | null>(null)
  const [notifyMessage, setNotifyMessage] = useState('')
  const [notifyImageFile, setNotifyImageFile] = useState<File | null>(null)
  const [notifyImagePreview, setNotifyImagePreview] = useState<string | null>(null)
  const [sending, setSending] = useState(false)

  const loadWinners = async () => {
    setLoading(true)

    const { data: winnersData, error } = await supabase
      .from('challenge_winners')
      .select('*')
      .order('created_at', { ascending: false })

    if (error || !winnersData || winnersData.length === 0) {
      setWinners([])
      setLoading(false)
      return
    }

    // 챌린지 정보, 닉네임, 게시물 제목 조회
    const challengeIds = [...new Set(winnersData.map(w => w.challenge_id))]
    const userIds = [...new Set(winnersData.map(w => w.user_id))]
    const postIds = [...new Set(winnersData.map(w => w.post_id))]

    const [challengesRes, profilesRes, postsRes] = await Promise.all([
      supabase.from('events').select('id, title, has_prize, prize, prize_image_url').in('id', challengeIds),
      supabase.from('profiles').select('id, nickname').in('id', userIds),
      supabase.from('community_posts').select('id, title').in('id', postIds),
    ])

    const challengeMap = new Map(
      (challengesRes.data ?? []).map(c => [c.id, c])
    )
    const profileMap = new Map(
      (profilesRes.data ?? []).map(p => [p.id, p.nickname])
    )
    const postMap = new Map(
      (postsRes.data ?? []).map(p => [p.id, p.title])
    )

    const result: WinnerItem[] = winnersData.map(w => {
      const challenge = challengeMap.get(w.challenge_id)
      return {
        ...w,
        challenge_title: challenge?.title ?? '알 수 없음',
        has_prize: challenge?.has_prize ?? false,
        prize: challenge?.prize ?? null,
        prize_image_url: challenge?.prize_image_url ?? null,
        winner_nickname: profileMap.get(w.user_id) ?? '알 수 없음',
        post_title: postMap.get(w.post_id) ?? '알 수 없음',
      }
    })

    setWinners(result)
    setLoading(false)
  }

  useEffect(() => {
    loadWinners()
  }, [])

  // 전송 완료 처리
  const markAsSent = async (winnerId: string) => {
    await supabase
      .from('challenge_winners')
      .update({ prize_sent: true })
      .eq('id', winnerId)

    setWinners(prev => prev.map(w =>
      w.id === winnerId ? { ...w, prize_sent: true } : w
    ))

    toast.success('전송 완료 처리되었습니다.')
  }

  // 알림 이미지 선택
  const handleNotifyImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setNotifyImageFile(file)
    setNotifyImagePreview(URL.createObjectURL(file))
  }

  const removeNotifyImage = () => {
    if (notifyImagePreview) URL.revokeObjectURL(notifyImagePreview)
    setNotifyImageFile(null)
    setNotifyImagePreview(null)
  }

  // 커스텀 알림 전송 (기프티콘 전송용)
  const sendCustomNotification = async () => {
    if (!notifyModal || !notifyMessage.trim()) return

    setSending(true)

    let imageUrl: string | null = null
    if (notifyImageFile) {
      imageUrl = await uploadImage(notifyImageFile)
    }

    await supabase.from('notifications').insert({
      user_id: notifyModal.winner.user_id,
      type: imageUrl ? 'prize' : 'admin',
      message: notifyMessage.trim(),
      link: `/events/${notifyModal.winner.challenge_id}`,
      image_url: imageUrl,
    })

    // 이미지가 있으면 상품 전송으로 간주
    if (imageUrl) {
      await supabase
        .from('challenge_winners')
        .update({ prize_sent: true })
        .eq('id', notifyModal.winner.id)

      setWinners(prev => prev.map(w =>
        w.id === notifyModal.winner.id ? { ...w, prize_sent: true } : w
      ))
    }

    setSending(false)
    setNotifyModal(null)
    setNotifyMessage('')
    removeNotifyImage()
    toast.success('알림이 전송되었습니다!')
  }

  const getStatus = (winner: WinnerItem) => {
    if (!winner.has_prize) {
      return { label: '상품 없음', color: 'bg-gray-100 text-gray-600' }
    }
    if (winner.prize_sent) {
      return { label: '전송 완료', color: 'bg-green-100 text-green-700' }
    }
    return { label: '전송 대기', color: 'bg-yellow-100 text-yellow-700' }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-40 text-sm text-gray-400">불러오는 중...</div>
  }

  return (
    <>
      <div className="p-4 space-y-3">
        {winners.length === 0 ? (
          <div className="text-center py-10">
            <Crown className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-400">아직 우승자가 없습니다.</p>
            <p className="text-xs text-gray-300 mt-1">챌린지 승인 탭에서 결과발표를 진행해주세요.</p>
          </div>
        ) : (
          winners.map((winner) => {
            const status = getStatus(winner)
            return (
              <div key={winner.id} className="bg-white rounded-xl p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center shrink-0">
                    <Crown className="w-5 h-5 text-amber-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 line-clamp-1">
                      {winner.challenge_title}
                    </p>
                    <p className="text-xs text-gray-600 mt-0.5 line-clamp-1">
                      우승작: {winner.post_title}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      우승자: {winner.winner_nickname}
                    </p>
                    {winner.has_prize && winner.prize && (
                      <p className="text-xs text-orange-500 mt-0.5 flex items-center gap-1">
                        <Gift className="w-3 h-3" />
                        {winner.prize}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${status.color}`}>
                        {status.label}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        {new Date(winner.created_at).toLocaleDateString('ko-KR')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 상품이 있는 경우에만 버튼 표시 */}
                {winner.has_prize && (
                  <div className="flex gap-2 mt-3">
                    {!winner.prize_sent && (
                      <>
                        <button
                          type="button"
                          onClick={() => setNotifyModal({ winner })}
                          className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg bg-purple-600 text-white text-sm font-medium"
                        >
                          <ImagePlus className="w-4 h-4" />
                          이미지 전송
                        </button>
                        <button
                          type="button"
                          onClick={() => markAsSent(winner.id)}
                          className="flex items-center justify-center gap-1 px-3 py-2 rounded-lg bg-green-50 text-green-600 text-sm font-medium"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      </>
                    )}
                    {winner.prize_sent && (
                      <div className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg bg-gray-100 text-gray-500 text-sm">
                        <Check className="w-4 h-4" />
                        전송 완료
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* 기프티콘 이미지 전송 모달 */}
      {notifyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setNotifyModal(null)} />
          <div className="relative w-[90%] max-w-sm bg-white rounded-2xl p-5">
            <h3 className="text-base font-bold text-gray-900 mb-1">기프티콘 전송</h3>
            <p className="text-xs text-gray-500 mb-4">
              {notifyModal.winner.winner_nickname}님에게 기프티콘 이미지를 전송합니다
            </p>

            <textarea
              value={notifyMessage}
              onChange={(e) => setNotifyMessage(e.target.value)}
              placeholder={`"${notifyModal.winner.challenge_title}" 챌린지 상품입니다!`}
              className="w-full h-20 px-3 py-2.5 bg-gray-100 rounded-lg text-sm outline-none resize-none mb-3"
            />

            {/* 이미지 첨부 */}
            <div className="mb-4">
              <p className="text-xs text-gray-500 mb-2">기프티콘 이미지 <span className="text-red-500">*</span></p>
              {notifyImagePreview ? (
                <div className="relative inline-block">
                  <img src={notifyImagePreview} alt="" className="w-24 h-24 object-cover rounded-lg" />
                  <button
                    type="button"
                    onClick={removeNotifyImage}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <label className="inline-flex flex-col items-center justify-center w-24 h-24 bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer text-gray-400 hover:border-blue-400 hover:bg-blue-50 transition-colors">
                  <Gift className="w-6 h-6" />
                  <span className="text-[10px] mt-1">이미지 선택</span>
                  <input
                    type="file"
                    accept={IMAGE_ACCEPT}
                    onChange={handleNotifyImage}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setNotifyModal(null)
                  setNotifyMessage('')
                  removeNotifyImage()
                }}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-gray-100 text-gray-600"
              >
                취소
              </button>
              <button
                type="button"
                onClick={sendCustomNotification}
                disabled={!notifyMessage.trim() || !notifyImageFile || sending}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold ${
                  notifyMessage.trim() && notifyImageFile && !sending
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-400'
                }`}
              >
                {sending ? '전송 중...' : '전송'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ── Main ──

type TabKey = 'stats' | 'reports' | 'hidden' | 'reporters' | 'events' | 'winners' | 'feedback' | 'ban'

const ALL_TABS: { key: TabKey; label: string; superOnly: boolean }[] = [
  { key: 'stats', label: '통계', superOnly: true },
  { key: 'reports', label: '신고 관리', superOnly: false },
  { key: 'hidden', label: '숨김 관리', superOnly: false },
  { key: 'reporters', label: '신고자 관리', superOnly: true },
  { key: 'events', label: '챌린지 관리', superOnly: true },
  { key: 'winners', label: '우승자 관리', superOnly: true },
  { key: 'feedback', label: '건의 관리', superOnly: true },
  { key: 'ban', label: '유저 제재', superOnly: true },
]

export default function AdminPage() {
  const navigate = useNavigate()
  const { role, isAdminMode } = useAuth()
  const isSuperAdmin = role === 'superadmin'

  const tabs = ALL_TABS.filter((t) => !t.superOnly || isSuperAdmin)
  const [activeTab, setActiveTab] = useState<TabKey>(isSuperAdmin ? 'stats' : 'reports')
  const [unreadFeedback, setUnreadFeedback] = useState(0)

  if (!isAdminMode) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 px-8">
        <p className="text-sm text-gray-500">관리자 모드를 켜야 접근할 수 있습니다.</p>
        <button
          type="button"
          onClick={() => navigate('/mypage')}
          className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold"
        >
          마이페이지로 이동
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <header className="shrink-0 flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-200">
        <button type="button" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-6 h-6 text-gray-700" />
        </button>
        <h1 className="text-lg font-bold">관리자</h1>
        <span className="text-xs text-orange-500 font-medium">
          {isSuperAdmin ? '최고 관리자' : '부관리자'}
        </span>
      </header>

      {/* Tabs - 4x2 Grid */}
      <div className="shrink-0 bg-white border-b border-gray-200 p-3">
        <div className="grid grid-cols-4 gap-2">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setActiveTab(t.key)}
              className={`relative py-2.5 px-1 text-xs font-semibold text-center rounded-lg transition-colors ${
                activeTab === t.key
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {t.label}
              {t.key === 'feedback' && unreadFeedback > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 flex items-center justify-center bg-red-500 text-white text-[9px] font-bold rounded-full">
                  {unreadFeedback > 99 ? '99+' : unreadFeedback}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'stats' && isSuperAdmin && <StatsTab />}
        {activeTab === 'reports' && <ReportsTab />}
        {activeTab === 'hidden' && <HiddenPostsTab />}
        {activeTab === 'reporters' && isSuperAdmin && <ReporterManageTab />}
        {activeTab === 'events' && isSuperAdmin && <EventManageTab />}
        {activeTab === 'winners' && isSuperAdmin && <WinnersTab />}
        {activeTab === 'feedback' && isSuperAdmin && <FeedbackTab onUnreadCount={setUnreadFeedback} />}
        {activeTab === 'ban' && isSuperAdmin && <BanTab />}
      </div>
    </div>
  )
}
