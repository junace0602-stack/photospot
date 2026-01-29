import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Trophy, Crown, Gift, ThumbsUp, X, Check, Flag, MoreVertical } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { displayName } from '../lib/displayName'

/* ── 타입 ─────────────────────────────────────────── */

interface Event {
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
  winner_criteria: string | null
  start_date: string
  end_date: string
  is_official: boolean
  status: string
  result_announced: boolean
  winner_id: string | null
  winner_post_id: string | null
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
  image_urls: string[]
  likes_count: number
  comment_count: number
  is_anonymous: boolean
  created_at: string
}

interface Winner {
  id: string
  challenge_id: string
  user_id: string
  post_id: string
  contact_info: string | null
  prize_sent: boolean
  created_at: string
}

/* ── 유틸 ─────────────────────────────────────────── */

function getEventStatus(event: Event): { label: string; color: string } {
  if (event.result_announced) return { label: '결과발표', color: 'bg-purple-100 text-purple-700' }
  const now = new Date()
  const start = new Date(event.start_date)
  const end = new Date(event.end_date)
  end.setHours(23, 59, 59, 999)
  if (now < start) return { label: '예정', color: 'bg-yellow-100 text-yellow-700' }
  if (now <= end) return { label: '진행중', color: 'bg-green-100 text-green-700' }
  return { label: '마감', color: 'bg-gray-100 text-gray-600' }
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('ko-KR')
}

/* ── 신고 모달 ─────────────────────────────────────── */

const REPORT_REASONS = [
  '부적절한 내용',
  '허위/사기성 챌린지',
  '스팸/광고',
  '기타',
] as const

function ReportModal({
  eventId,
  onClose,
  onSuccess,
}: {
  eventId: string
  onClose: () => void
  onSuccess: () => void
}) {
  const { user } = useAuth()
  const [reason, setReason] = useState('')
  const [detail, setDetail] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!reason || !user) return

    setSubmitting(true)

    // 신고 저장
    const { error } = await supabase.from('reports').insert({
      target_type: 'event',
      target_id: eventId,
      reporter_id: user.id,
      reason,
      detail: detail.trim() || null,
    })

    if (error) {
      toast.error('신고에 실패했습니다.')
      setSubmitting(false)
      return
    }

    // 신고 수 확인 후 5개 이상이면 자동 숨김
    const { count } = await supabase
      .from('reports')
      .select('*', { count: 'exact', head: true })
      .eq('target_type', 'event')
      .eq('target_id', eventId)

    if (count && count >= 5) {
      await supabase.from('events').update({ hidden: true }).eq('id', eventId)
    }

    setSubmitting(false)
    onSuccess()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-[90%] max-w-sm bg-white rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-gray-900">챌린지 신고</h3>
          <button type="button" onClick={onClose} className="text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-gray-500 mb-3">신고 사유를 선택해주세요</p>

        <div className="space-y-2 mb-4">
          {REPORT_REASONS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setReason(r)}
              className={`w-full px-4 py-3 rounded-xl text-sm text-left border-2 transition-colors ${
                reason === r
                  ? 'border-red-500 bg-red-50 text-red-700'
                  : 'border-gray-100 text-gray-700 hover:border-gray-200'
              }`}
            >
              {r}
            </button>
          ))}
        </div>

        <textarea
          value={detail}
          onChange={(e) => setDetail(e.target.value)}
          placeholder="상세 내용 (선택)"
          className="w-full h-20 px-3 py-2.5 bg-gray-100 rounded-xl text-sm outline-none resize-none mb-4"
        />

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!reason || submitting}
          className={`w-full py-3 rounded-xl text-sm font-semibold ${
            reason && !submitting
              ? 'bg-red-500 text-white'
              : 'bg-gray-200 text-gray-400'
          }`}
        >
          {submitting ? '신고 중...' : '신고하기'}
        </button>
      </div>
    </div>
  )
}

/* ── 우승자 선정 모달 ───────────────────────────────── */

function WinnerSelectModal({
  event,
  posts,
  onClose,
  onConfirm,
}: {
  event: Event
  posts: ChallengePost[]
  onClose: () => void
  onConfirm: (winner: Winner, winnerPost: ChallengePost) => void
}) {
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)

  const handleConfirm = async () => {
    if (!selectedPostId) return

    const selectedPost = posts.find(p => p.id === selectedPostId)
    if (!selectedPost) return

    setConfirming(true)

    // 1. challenge_winners에 저장
    const { data: winnerData, error: winnerError } = await supabase
      .from('challenge_winners')
      .insert({
        challenge_id: event.id,
        user_id: selectedPost.user_id,
        post_id: selectedPost.id,
      })
      .select()
      .single()

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

    // 3. 우승자에게 알림 (상품 이미지 포함)
    if (event.has_prize && event.prize_image_url) {
      // 상품이 있는 경우: 축하 메시지 + 기프티콘 이미지 동봉
      await supabase.from('notifications').insert({
        user_id: selectedPost.user_id,
        type: 'winner',
        message: `축하합니다! "${event.title}" 챌린지에서 우승하셨습니다! 상품: ${event.prize}`,
        link: `/events/${event.id}`,
        image_url: event.prize_image_url,
      })

      // prize_sent 업데이트
      await supabase
        .from('challenge_winners')
        .update({ prize_sent: true })
        .eq('id', winnerData.id)
    } else {
      // 상품이 없는 경우: 축하 알림만
      await supabase.from('notifications').insert({
        user_id: selectedPost.user_id,
        type: 'winner',
        message: `축하합니다! "${event.title}" 챌린지에서 우승하셨습니다!`,
        link: `/events/${event.id}`,
      })
    }

    setConfirming(false)
    onConfirm(winnerData as Winner, selectedPost)
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
          {posts.length === 0 ? (
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
                        <img src={post.thumbnail_url} alt="" className="w-14 h-14 rounded-lg object-cover" />
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
                      <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                        <ThumbsUp className="w-3 h-3" />
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

/* ── 메인 컴포넌트 ────────────────────────────────── */

export default function EventDetailPage() {
  const { eventId } = useParams<{ eventId: string }>()
  const navigate = useNavigate()
  const { loggedIn, isAdminMode, user } = useAuth()

  const [event, setEvent] = useState<Event | null>(null)
  const [posts, setPosts] = useState<ChallengePost[]>([])
  const [winner, setWinner] = useState<Winner | null>(null)
  const [winnerPost, setWinnerPost] = useState<ChallengePost | null>(null)
  const [loading, setLoading] = useState(true)

  // 우승자 선정 모달
  const [showWinnerModal, setShowWinnerModal] = useState(false)

  // 신고 모달
  const [showReportModal, setShowReportModal] = useState(false)

  // 더보기 메뉴
  const [showMenu, setShowMenu] = useState(false)

  const loadData = useCallback(async () => {
    if (!eventId) return

    const [eventRes, postsRes, winnerRes] = await Promise.all([
      supabase.from('events').select('*').eq('id', eventId).single(),
      supabase
        .from('community_posts')
        .select('id, user_id, author_nickname, title, thumbnail_url, image_urls, likes_count, comment_count, is_anonymous, created_at')
        .eq('event_id', eventId)
        .order('likes_count', { ascending: false }),
      supabase
        .from('challenge_winners')
        .select('*')
        .eq('challenge_id', eventId)
        .maybeSingle(),
    ])

    if (eventRes.data) setEvent(eventRes.data as Event)
    if (postsRes.data) {
      const postsData = postsRes.data as ChallengePost[]
      setPosts(postsData)

      // 우승 게시물 찾기
      if (winnerRes.data) {
        const winnerData = winnerRes.data as Winner
        setWinner(winnerData)
        const wp = postsData.find(p => p.id === winnerData.post_id)
        if (wp) setWinnerPost(wp)
      }
    }

    setLoading(false)
  }, [eventId])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleParticipate = () => {
    if (!loggedIn) {
      toast('로그인이 필요합니다.')
      return
    }
    navigate(`/posts/new?challengeId=${eventId}`)
  }

  // 우승자 확정 후 처리
  const handleWinnerConfirmed = (newWinner: Winner, newWinnerPost: ChallengePost) => {
    setWinner(newWinner)
    setWinnerPost(newWinnerPost)
    setEvent(prev => prev ? { ...prev, result_announced: true, winner_id: newWinner.user_id, winner_post_id: newWinner.post_id } : null)
    setShowWinnerModal(false)
    toast.success('우승자가 선정되었습니다!')
  }

  // 신고 완료 후
  const handleReportSuccess = () => {
    setShowReportModal(false)
    toast.success('신고가 접수되었습니다.')
  }

  // 주최자 또는 관리자인지 확인
  const canSelectWinner = event && (
    isAdminMode ||
    (user?.id === event.user_id)
  )

  // 챌린지가 종료되었는지 확인
  const isEnded = event && new Date() > new Date(event.end_date + 'T23:59:59')

  // 본인 챌린지인지 확인
  const isOwner = event && user?.id === event.user_id

  if (loading) {
    return (
      <div className="flex flex-col h-full bg-gray-50">
        <div className="flex items-center justify-center h-40 text-sm text-gray-400">
          불러오는 중...
        </div>
      </div>
    )
  }

  if (!event) {
    return (
      <div className="flex flex-col h-full bg-gray-50">
        <header className="shrink-0 flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-200">
          <button type="button" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-6 h-6 text-gray-700" />
          </button>
          <h1 className="text-lg font-bold">챌린지</h1>
        </header>
        <div className="flex items-center justify-center h-40 text-sm text-gray-400">
          챌린지를 찾을 수 없습니다.
        </div>
      </div>
    )
  }

  // 숨김 처리된 챌린지
  if (event.hidden && !isAdminMode) {
    return (
      <div className="flex flex-col h-full bg-gray-50">
        <header className="shrink-0 flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-200">
          <button type="button" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-6 h-6 text-gray-700" />
          </button>
          <h1 className="text-lg font-bold">챌린지</h1>
        </header>
        <div className="flex items-center justify-center h-40 text-sm text-gray-400">
          신고로 인해 숨김 처리된 챌린지입니다.
        </div>
      </div>
    )
  }

  const status = getEventStatus(event)
  const isOngoing = status.label === '진행중'
  const topPost = posts[0] // 추천수 1위

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* 헤더 */}
      <header className="shrink-0 flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-200">
        <button type="button" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-6 h-6 text-gray-700" />
        </button>
        <h1 className="text-lg font-bold flex-1 truncate">{event.title}</h1>

        {/* 더보기 메뉴 */}
        {loggedIn && !isOwner && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowMenu(!showMenu)}
              className="p-1 text-gray-500"
            >
              <MoreVertical className="w-5 h-5" />
            </button>

            {showMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 top-full mt-1 z-50 bg-white rounded-xl shadow-lg border border-gray-100 py-1 min-w-[120px]">
                  <button
                    type="button"
                    onClick={() => {
                      setShowMenu(false)
                      setShowReportModal(true)
                    }}
                    className="w-full px-4 py-2.5 text-left text-sm text-red-500 flex items-center gap-2 hover:bg-gray-50"
                  >
                    <Flag className="w-4 h-4" />
                    신고하기
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </header>

      {/* 본문 */}
      <div className="flex-1 overflow-y-auto">
        {/* 숨김 안내 (관리자만) */}
        {event.hidden && isAdminMode && (
          <div className="mx-4 mt-4 p-3 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-sm text-red-700 font-medium">신고로 인해 숨김 처리된 챌린지입니다.</p>
          </div>
        )}

        {/* 챌린지 정보 카드 */}
        <div className="bg-white mx-4 mt-4 rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {event.thumbnail_url && (
            <img src={event.thumbnail_url} alt="" className="w-full h-48 object-cover" />
          )}
          <div className="p-4 space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${status.color}`}>
                {status.label}
              </span>
              {event.is_official && (
                <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 flex items-center gap-1">
                  <Trophy className="w-3 h-3" />
                  공식
                </span>
              )}
              {event.has_prize && (
                <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700 flex items-center gap-1">
                  <Gift className="w-3 h-3" />
                  상품 있음
                </span>
              )}
            </div>

            <div className="space-y-1.5 text-sm">
              <div className="flex">
                <span className="text-gray-400 w-14 shrink-0">주제</span>
                <span className="text-gray-800">{event.topic}</span>
              </div>
              <div className="flex">
                <span className="text-gray-400 w-14 shrink-0">기간</span>
                <span className="text-gray-800">
                  {formatDate(event.start_date)} ~ {formatDate(event.end_date)}
                </span>
              </div>
              {event.has_prize && event.prize && (
                <div className="flex">
                  <span className="text-gray-400 w-14 shrink-0">상품</span>
                  <span className="text-gray-800">{event.prize}</span>
                </div>
              )}
              <div className="flex">
                <span className="text-gray-400 w-14 shrink-0">참여</span>
                <span className="text-gray-800">{event.entries_count}명</span>
              </div>
              <div className="flex">
                <span className="text-gray-400 w-14 shrink-0">주최자</span>
                <span className="text-gray-800">{event.author_nickname}</span>
              </div>
              {event.winner_criteria && (
                <div className="flex">
                  <span className="text-gray-400 w-14 shrink-0">기준</span>
                  <span className="text-gray-800">{event.winner_criteria}</span>
                </div>
              )}
            </div>

            {event.description && (
              <p className="text-sm text-gray-600 whitespace-pre-wrap border-t border-gray-100 pt-3">
                {event.description}
              </p>
            )}
          </div>
        </div>

        {/* 우승자 표시 (결과 발표 후) */}
        {winner && winnerPost && event.result_announced && (
          <div className="mx-4 mt-4 bg-gradient-to-r from-amber-400 to-orange-400 rounded-2xl p-4 text-white">
            <div className="flex items-center gap-2 mb-2">
              <Crown className="w-5 h-5" />
              <span className="font-bold">우승자</span>
            </div>
            <button
              type="button"
              onClick={() => navigate(`/community/${winnerPost.id}`)}
              className="w-full bg-white/20 rounded-xl p-3 text-left"
            >
              <p className="font-semibold truncate">{winnerPost.title}</p>
              <p className="text-sm opacity-80 mt-0.5">
                {winnerPost.is_anonymous ? '익명' : winnerPost.author_nickname}
              </p>
            </button>
          </div>
        )}

        {/* 참여하기 버튼 */}
        {isOngoing && (
          <div className="px-4 mt-3">
            <button
              type="button"
              onClick={handleParticipate}
              className="w-full py-3 bg-blue-600 text-white rounded-xl text-sm font-semibold"
            >
              참여하기
            </button>
          </div>
        )}

        {/* 우승자 선정 버튼 (주최자/관리자만) */}
        {canSelectWinner && !event.result_announced && posts.length > 0 && (
          <div className="px-4 mt-4">
            {isEnded ? (
              // 종료됨 → 버튼 활성화
              <>
                <button
                  type="button"
                  onClick={() => setShowWinnerModal(true)}
                  className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-lg"
                >
                  <Crown className="w-5 h-5" />
                  우승자 선정하기
                </button>
                <p className="text-xs text-gray-500 text-center mt-2">
                  챌린지가 종료되었습니다. 참여작 중 우승작을 선정해주세요.
                </p>
              </>
            ) : (
              // 진행 중 → 버튼 비활성화
              <>
                <button
                  type="button"
                  disabled
                  className="w-full py-3.5 bg-gray-200 text-gray-400 rounded-xl text-sm font-bold flex items-center justify-center gap-2 cursor-not-allowed"
                >
                  <Crown className="w-5 h-5" />
                  우승자 선정하기
                </button>
                <p className="text-xs text-gray-400 text-center mt-2">
                  챌린지가 종료되면 우승자를 선정할 수 있습니다.
                </p>
              </>
            )}
          </div>
        )}

        {/* 추천수 1위 정보 (종료 후, 미선정, 공식 챌린지, 주최자/관리자 뷰) */}
        {isEnded && !event.result_announced && canSelectWinner && topPost && event.is_official && (
          <div className="mx-4 mt-4 bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2 text-blue-700">
              <ThumbsUp className="w-4 h-4" />
              <span className="text-sm font-semibold">추천수 1위</span>
            </div>
            <div className="flex items-center gap-3">
              {topPost.thumbnail_url && (
                <img src={topPost.thumbnail_url} alt="" className="w-14 h-14 rounded-lg object-cover" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{topPost.title}</p>
                <p className="text-xs text-gray-500">
                  {topPost.is_anonymous ? '익명' : topPost.author_nickname} · 추천 {topPost.likes_count}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 참여작 목록 */}
        <div className="px-4 mt-6 mb-4">
          <h2 className="text-base font-bold text-gray-900 mb-3">
            참여작 ({posts.length})
          </h2>

          {posts.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-10">
              아직 참여작이 없습니다.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {posts.map((post, index) => {
                const isWinner = winner?.post_id === post.id
                const isTop = index === 0 && event.is_official

                return (
                  <button
                    key={post.id}
                    type="button"
                    onClick={() => navigate(`/community/${post.id}`)}
                    className={`rounded-xl shadow-sm border overflow-hidden text-left relative ${
                      isWinner
                        ? 'border-amber-400 ring-2 ring-amber-200'
                        : isTop && isEnded && !event.result_announced
                        ? 'border-blue-300 ring-1 ring-blue-100'
                        : 'border-gray-100 bg-white'
                    }`}
                  >
                    {/* 우승 뱃지 */}
                    {isWinner && (
                      <div className="absolute top-2 left-2 z-10 bg-amber-400 text-white px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-0.5">
                        <Crown className="w-3 h-3" />
                        우승
                      </div>
                    )}
                    {/* 1위 뱃지 (우승자가 아닐 때만) */}
                    {isTop && !isWinner && (
                      <div className="absolute top-2 left-2 z-10 bg-blue-500 text-white px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-0.5">
                        <ThumbsUp className="w-3 h-3" />
                        1위
                      </div>
                    )}
                    {post.thumbnail_url ? (
                      <img src={post.thumbnail_url} alt="" className="w-full h-32 object-cover" />
                    ) : (
                      <div className="w-full h-32 bg-gray-100 flex items-center justify-center">
                        <Trophy className="w-8 h-8 text-gray-300" />
                      </div>
                    )}
                    <div className="p-2.5 bg-white">
                      <p className="text-xs font-medium text-gray-900 line-clamp-1">{post.title}</p>
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-[10px] text-gray-400">
                          {displayName(post.author_nickname, post.is_anonymous, isAdminMode)}
                        </p>
                        <p className="text-[10px] text-gray-400 flex items-center gap-0.5">
                          <ThumbsUp className="w-3 h-3" />
                          {post.likes_count}
                        </p>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* 우승자 선정 모달 */}
      {showWinnerModal && event && (
        <WinnerSelectModal
          event={event}
          posts={posts}
          onClose={() => setShowWinnerModal(false)}
          onConfirm={handleWinnerConfirmed}
        />
      )}

      {/* 신고 모달 */}
      {showReportModal && eventId && (
        <ReportModal
          eventId={eventId}
          onClose={() => setShowReportModal(false)}
          onSuccess={handleReportSuccess}
        />
      )}
    </div>
  )
}
