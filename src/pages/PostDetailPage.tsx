import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import ReportModal from '../components/ReportModal'
import toast from 'react-hot-toast'
import { share } from '../utils/share'
import { supabase } from '../lib/supabase'
import { moderateText, checkDuplicateComment } from '../lib/moderation'
import { checkSuspension } from '../lib/penalty'
import { hasExifData, type ExifData } from '../lib/exif'
import { notifyComment, notifyPopular } from '../lib/notifications'
import { useAuth } from '../contexts/AuthContext'
import { useBlockedUsers } from '../hooks/useBlockedUsers'
import { extractYouTubeUrls } from '../lib/youtube'
import YouTubeEmbed from '../components/YouTubeEmbed'
import type { Post, ContentBlock, Comment } from '../lib/types'
import { displayNameInPost, buildAnonMap } from '../lib/displayName'
import {
  ArrowLeft,
  ThumbsUp,
  Flag,
  X,
  Send,
  Car,
  Clock,
  Users,
  Calendar,
  Camera,
  Tag,
  TicketCheck,
  Lightbulb,
  Shield,
  Share2,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Pencil,
  Trash2,
  MoreVertical,
  Ban,
  Eye,
  Info,
  Aperture,
} from 'lucide-react'

function PhotoViewer({
  photos,
  startIndex,
  onClose,
  exifData,
}: {
  photos: string[]
  startIndex: number
  onClose: () => void
  exifData?: ExifData | null
}) {
  const [index, setIndex] = useState(startIndex)
  const [showExif, setShowExif] = useState(false)

  // 줌 상태
  const [scale, setScale] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })

  // 터치 관련 ref
  const touchStartRef = useRef({ x: 0, y: 0 })
  const lastTapRef = useRef(0)
  const initialPinchDistRef = useRef(0)
  const initialScaleRef = useRef(1)
  const isPinchingRef = useRef(false)
  const isDraggingRef = useRef(false)
  const lastPositionRef = useRef({ x: 0, y: 0 })
  const swipeStartXRef = useRef(0)

  const hasPrev = index > 0
  const hasNext = index < photos.length - 1
  const prev = () => { resetZoom(); setIndex((i) => Math.max(0, i - 1)) }
  const next = () => { resetZoom(); setIndex((i) => Math.min(photos.length - 1, i + 1)) }

  const resetZoom = () => {
    setScale(1)
    setPosition({ x: 0, y: 0 })
  }

  // 사진 변경 시 줌 리셋
  useEffect(() => {
    resetZoom()
  }, [index])

  // 키보드 방향키
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') prev()
      else if (e.key === 'ArrowRight') next()
      else if (e.key === 'Escape') {
        if (scale > 1) resetZoom()
        else if (showExif) setShowExif(false)
        else onClose()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose, photos.length, showExif, scale])

  // 두 손가락 사이 거리 계산
  const getDistance = (touches: React.TouchList) => {
    const dx = touches[0].clientX - touches[1].clientX
    const dy = touches[0].clientY - touches[1].clientY
    return Math.sqrt(dx * dx + dy * dy)
  }

  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      // 핀치 시작
      isPinchingRef.current = true
      isDraggingRef.current = false
      initialPinchDistRef.current = getDistance(e.touches)
      initialScaleRef.current = scale
    } else if (e.touches.length === 1) {
      // 더블탭 체크
      const now = Date.now()
      if (now - lastTapRef.current < 300) {
        // 더블탭 - 줌 토글
        if (scale > 1) {
          resetZoom()
        } else {
          setScale(2)
          setPosition({ x: 0, y: 0 })
        }
        lastTapRef.current = 0
        return
      }
      lastTapRef.current = now

      // 드래그 시작
      touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
      lastPositionRef.current = position
      swipeStartXRef.current = e.touches[0].clientX

      if (scale > 1) {
        isDraggingRef.current = true
      }
    }
  }

  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && isPinchingRef.current) {
      // 핀치 줌
      const dist = getDistance(e.touches)
      const newScale = Math.min(3, Math.max(1, initialScaleRef.current * (dist / initialPinchDistRef.current)))
      setScale(newScale)

      // 줌 아웃 시 위치 리셋
      if (newScale <= 1) {
        setPosition({ x: 0, y: 0 })
      }
    } else if (e.touches.length === 1 && scale > 1 && isDraggingRef.current) {
      // 확대 상태에서 드래그
      const dx = e.touches[0].clientX - touchStartRef.current.x
      const dy = e.touches[0].clientY - touchStartRef.current.y
      setPosition({
        x: lastPositionRef.current.x + dx,
        y: lastPositionRef.current.y + dy,
      })
    }
  }

  const onTouchEnd = (e: React.TouchEvent) => {
    if (isPinchingRef.current) {
      isPinchingRef.current = false
      if (scale <= 1) {
        resetZoom()
      }
      return
    }

    // 스와이프로 이전/다음 사진 (확대 안 된 상태에서만)
    if (scale <= 1 && e.changedTouches.length === 1) {
      const deltaX = e.changedTouches[0].clientX - swipeStartXRef.current
      if (deltaX < -50) next()
      else if (deltaX > 50) prev()
    }

    isDraggingRef.current = false
  }

  const handleBackgroundClick = () => {
    if (scale > 1) {
      resetZoom()
    } else if (showExif) {
      setShowExif(false)
    } else {
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      <div className="flex items-center justify-between px-4 py-3">
        <span className="text-white text-sm font-medium">
          {index + 1} / {photos.length}
        </span>
        <div className="flex items-center gap-2">
          {hasExifData(exifData) && (
            <button
              type="button"
              onClick={() => setShowExif(!showExif)}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                showExif ? 'bg-white text-black' : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              <Info className="w-5 h-5" />
            </button>
          )}
          <button type="button" onClick={onClose}>
            <X className="w-6 h-6 text-white" />
          </button>
        </div>
      </div>
      <div
        className="flex-1 flex items-center justify-center overflow-hidden relative"
        onClick={handleBackgroundClick}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <img
          src={photos[index]}
          alt={`사진 ${index + 1}`}
          className="max-w-full max-h-full object-contain select-none"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transition: isPinchingRef.current || isDraggingRef.current ? 'none' : 'transform 0.2s ease-out',
          }}
          draggable={false}
          onClick={(e) => {
            e.stopPropagation()
            if (showExif) setShowExif(false)
          }}
        />

        {/* PC 좌우 화살표 */}
        {hasPrev && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); prev() }}
            className="hidden sm:flex absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 hover:bg-black/70 rounded-full items-center justify-center"
          >
            <ChevronLeft className="w-6 h-6 text-white" />
          </button>
        )}
        {hasNext && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); next() }}
            className="hidden sm:flex absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 hover:bg-black/70 rounded-full items-center justify-center"
          >
            <ChevronRight className="w-6 h-6 text-white" />
          </button>
        )}

        {/* EXIF 팝업 */}
        {showExif && exifData && (
          <div
            className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-sm rounded-xl p-4 min-w-[260px] max-w-[90%]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-white">
                <Camera className="w-4 h-4" />
                <span className="text-sm font-semibold">촬영 정보</span>
              </div>
              <button type="button" onClick={() => setShowExif(false)}>
                <X className="w-4 h-4 text-white/60 hover:text-white" />
              </button>
            </div>
            <div className="space-y-2 text-sm text-white/90">
              {exifData.dateTime && (
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-white/60 shrink-0" />
                  <span>{exifData.dateTime}</span>
                </div>
              )}
              {exifData.camera && (
                <div className="flex items-center gap-2">
                  <Camera className="w-4 h-4 text-white/60 shrink-0" />
                  <span>{exifData.camera}</span>
                </div>
              )}
              {exifData.lens && (
                <div className="flex items-center gap-2">
                  <Aperture className="w-4 h-4 text-white/60 shrink-0" />
                  <span>{exifData.lens}</span>
                </div>
              )}
              {(exifData.aperture || exifData.shutterSpeed || exifData.iso) && (
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 text-white/60 shrink-0 text-center text-xs">ISO</span>
                  <span>
                    {[exifData.aperture, exifData.shutterSpeed, exifData.iso ? `ISO${exifData.iso}` : null]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </div>
              )}
              {exifData.focalLength && (
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 text-white/60 shrink-0 text-center text-xs">mm</span>
                  <span>{exifData.focalLength}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      <div className="flex justify-center gap-1.5 pb-6">
        {photos.map((_, i) => (
          <span
            key={i}
            className={`w-1.5 h-1.5 rounded-full ${i === index ? 'bg-white' : 'bg-white/40'}`}
          />
        ))}
      </div>
    </div>
  )
}

export default function PostDetailPage() {
  const { spotId, postId } = useParams()
  const navigate = useNavigate()
  const { user, profile, loggedIn, isAdminMode } = useAuth()
  const { isBlocked, blockUser } = useBlockedUsers()

  const [post, setPost] = useState<Post | null>(null)
  const [placeName, setPlaceName] = useState('')
  const [loading, setLoading] = useState(true)
  const [blockTarget, setBlockTarget] = useState<{ id: string; nickname: string } | null>(null)

  const [liked, setLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [likeLoading, setLikeLoading] = useState(false)

  const [comments, setComments] = useState<Comment[]>([])
  const [commentText, setCommentText] = useState('')
  const [commentAnonymous, setCommentAnonymous] = useState(false)
  const [commentSending, setCommentSending] = useState(false)

  const [viewerIndex, setViewerIndex] = useState<number | null>(null)
  const [reportOpen, setReportOpen] = useState(false)
  const [viewCount, setViewCount] = useState(0)

  // 글 수정/삭제
  const [showPostMenu, setShowPostMenu] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // 댓글 수정/삭제
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null)
  const [editCommentText, setEditCommentText] = useState('')
  const [commentMenuId, setCommentMenuId] = useState<string | null>(null)

  useEffect(() => {
    if (!postId || !spotId) return

    const load = async () => {
      // 기본 쿼리들
      const [postRes, placeRes, commentsRes, likesCountRes] = await Promise.all([
        supabase.from('posts').select('*').eq('id', postId).maybeSingle(),
        supabase.from('places').select('name').eq('id', spotId).maybeSingle(),
        supabase
          .from('comments')
          .select('id, post_id, user_id, author_nickname, content, is_anonymous, created_at')
          .eq('post_id', postId)
          .order('created_at', { ascending: true })
          .limit(200),
        supabase
          .from('likes')
          .select('id', { count: 'exact', head: true })
          .eq('post_id', postId),
      ])

      // 디버깅: 쿼리 에러 확인
      if (postRes.error) {
        console.error('Post query error:', postRes.error)
      }

      if (postRes.data) {
        setPost(postRes.data as Post)
        setViewCount((postRes.data as Post).view_count ?? 0)
      }
      if (placeRes.data) setPlaceName(placeRes.data.name)
      setComments((commentsRes.data ?? []) as Comment[])
      setLikeCount(likesCountRes.count ?? 0)

      // 로그인 상태면 내 추천 여부도 조회
      if (user) {
        const myLikeRes = await supabase
          .from('likes')
          .select('id')
          .eq('post_id', postId)
          .eq('user_id', user.id)
          .maybeSingle()
        setLiked(!!myLikeRes.data)
      }

      setLoading(false)
    }

    load()
  }, [postId, spotId, user])

  // 조회수 증가 (낙관적 UI + 단일 호출)
  useEffect(() => {
    if (!postId || !post) return

    // 낙관적 UI: 즉시 +1 표시
    setViewCount((post.view_count ?? 0) + 1)

    // 백그라운드에서 DB 업데이트 (단일 호출)
    supabase
      .from('posts')
      .update({ view_count: (post.view_count ?? 0) + 1 })
      .eq('id', postId)
  }, [postId, post?.view_count])

  const toggleLike = useCallback(async () => {
    if (!loggedIn || !user || !postId || likeLoading) return
    setLikeLoading(true)

    // 낙관적 UI
    const wasLiked = liked
    const newCount = likeCount + (wasLiked ? -1 : 1)
    setLiked(!wasLiked)
    setLikeCount(newCount)

    // 1. 좋아요 토글 (DELETE 또는 INSERT)
    if (wasLiked) {
      await supabase
        .from('likes')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', user.id)
    } else {
      await supabase
        .from('likes')
        .insert({ post_id: postId, user_id: user.id })
    }

    // 2. posts 캐시 카운트 갱신 (낙관적 카운트 사용, SELECT 제거)
    await supabase
      .from('posts')
      .update({ likes_count: Math.max(0, newCount) })
      .eq('id', postId)

    setLikeLoading(false)

    // 인기글 알림
    if (post && spotId && !wasLiked) {
      notifyPopular(post.user_id, post.title, `/spots/${spotId}/posts/${postId}`, newCount)
    }
  }, [liked, likeCount, likeLoading, loggedIn, postId, spotId, post, user])

  const submitComment = useCallback(async () => {
    if (!commentText.trim() || !user || !postId || commentSending) return
    setCommentSending(true)

    try {
      // 정지 상태 체크
      const suspension = await checkSuspension(user.id)
      if (suspension.isSuspended) {
        toast.error(suspension.message ?? '계정이 정지되었습니다.')
        return
      }

      // 텍스트 검열
      const modResult = await moderateText(commentText.trim())
      if (modResult.blocked) {
        toast.error(modResult.message ?? '부적절한 내용입니다.')
        return
      }

      // 중복 댓글 체크
      const dupResult = await checkDuplicateComment(user.id, commentText.trim())
      if (dupResult.blocked) {
        toast.error(dupResult.message ?? '중복된 내용입니다.')
        return
      }

      const { data, error } = await supabase
        .from('comments')
        .insert({
          post_id: postId,
          user_id: user.id,
          author_nickname: profile?.nickname ?? '익명',
          content: commentText.trim(),
          is_anonymous: commentAnonymous,
        })
        .select()
        .single()

      if (error) {
        toast.error('댓글 작성에 실패했습니다: ' + error.message)
        return
      }

      setComments((prev) => [...prev, data as Comment])
      setCommentText('')
      setCommentAnonymous(false)

      // comment_count 갱신
      await supabase
        .from('posts')
        .update({ comment_count: comments.length + 1 })
        .eq('id', postId)

      // 알림 생성
      if (post && spotId) {
        notifyComment(post.user_id, user.id, post.title, `/spots/${spotId}/posts/${postId}`)
      }
    } catch {
      toast.error('댓글 작성 중 오류가 발생했습니다.')
    } finally {
      setCommentSending(false)
    }
  }, [commentText, commentAnonymous, commentSending, comments.length, postId, spotId, post, profile, user])

  const isOwner = !!user && !!post && user.id === post.user_id
  const isAdmin = isAdminMode

  // 같은 게시물 내 익명 유저 번호 맵
  const anonMap = useMemo(
    () => (post ? buildAnonMap(post.user_id, comments) : new Map<string, number>()),
    [post, comments],
  )

  const visibleComments = useMemo(
    () => comments.filter((c) => !isBlocked(c.user_id)),
    [comments, isBlocked],
  )

  const handleDeletePost = useCallback(async () => {
    if (!postId || !spotId || deleting) return
    if (!confirm('이 글을 삭제하시겠습니까?')) return
    setDeleting(true)

    // 댓글, 좋아요 먼저 삭제
    await supabase.from('comments').delete().eq('post_id', postId)
    await supabase.from('likes').delete().eq('post_id', postId)
    const { error } = await supabase.from('posts').delete().eq('id', postId)

    setDeleting(false)
    if (error) {
      toast.error('삭제에 실패했습니다.')
      return
    }
    navigate(-1)
  }, [postId, spotId, deleting, navigate])

  const handleEditPost = useCallback(() => {
    if (!post || !spotId) return
    navigate(`/spots/${spotId}/posts/new`, { state: { editPost: post } })
  }, [post, spotId, navigate])

  const handleDeleteComment = useCallback(async (commentId: string) => {
    if (!confirm('댓글을 삭제하시겠습니까?')) return

    const { error } = await supabase.from('comments').delete().eq('id', commentId)
    if (error) {
      toast.error('삭제에 실패했습니다.')
      return
    }
    setComments((prev) => prev.filter((c) => c.id !== commentId))
    if (postId) {
      await supabase
        .from('posts')
        .update({ comment_count: Math.max(0, comments.length - 1) })
        .eq('id', postId)
    }
  }, [comments.length, postId])

  const handleEditComment = useCallback(async (commentId: string) => {
    const text = editCommentText.trim()
    if (!text) return

    // 텍스트 검열
    const modResult = await moderateText(text)
    if (modResult.blocked) {
      toast.error(modResult.message ?? '부적절한 내용입니다.')
      return
    }

    const { error } = await supabase
      .from('comments')
      .update({ content: text })
      .eq('id', commentId)
    if (error) {
      toast.error('수정에 실패했습니다.')
      return
    }
    setComments((prev) =>
      prev.map((c) => (c.id === commentId ? { ...c, content: text } : c)),
    )
    setEditingCommentId(null)
    setEditCommentText('')
  }, [editCommentText])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-gray-400">
        불러오는 중...
      </div>
    )
  }

  if (!post) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-gray-400">
        글을 찾을 수 없습니다.
      </div>
    )
  }

  const blocks: ContentBlock[] = post.content_blocks
  const photos = blocks.filter((b) => b.type === 'photo').map((b) => b.url!)

  // 본문에서 YouTube URL 추출
  const youtubeVideos = useMemo(() => {
    console.log('[PostDetail YouTube] post.youtube_urls:', post.youtube_urls)
    console.log('[PostDetail YouTube] blocks:', blocks)

    // youtube_urls 필드가 있으면 그것 사용, 없으면 본문에서 추출
    if (post.youtube_urls && post.youtube_urls.length > 0) {
      const videos = extractYouTubeUrls(post.youtube_urls.join(' '))
      console.log('[PostDetail YouTube] from youtube_urls field:', videos)
      return videos
    }
    const allText = blocks
      .filter((b) => b.type === 'text')
      .map((b) => b.text ?? '')
      .join('\n')
    console.log('[PostDetail YouTube] allText from blocks:', allText)
    const videos = extractYouTubeUrls(allText)
    console.log('[PostDetail YouTube] extracted videos:', videos)
    return videos
  }, [post.youtube_urls, blocks])

  // Build meta rows
  const metaRows: { icon: typeof Car; label: string; value: string }[] = []
  if (post.categories.length > 0)
    metaRows.push({ icon: Tag, label: '카테고리', value: post.categories.join(', ') })
  if (post.time_slots.length > 0)
    metaRows.push({ icon: Clock, label: '추천 시간대', value: post.time_slots.join(', ') })
  if (post.tripod) {
    const tripodVal = post.tripod === '기타' && post.tripod_note ? post.tripod_note : post.tripod
    metaRows.push({ icon: Camera, label: '삼각대', value: tripodVal })
  }
  if (post.equipment_text)
    metaRows.push({ icon: Camera, label: '장비', value: post.equipment_text })
  if (post.tip)
    metaRows.push({ icon: Lightbulb, label: '팁', value: post.tip })
  if (post.visit_date)
    metaRows.push({ icon: Calendar, label: '방문 날짜', value: post.visit_date })
  if (post.crowdedness)
    metaRows.push({ icon: Users, label: '혼잡도', value: post.crowdedness })
  if (post.parking) {
    const parkVal = post.parking === '기타' && post.parking_note ? post.parking_note : post.parking
    metaRows.push({ icon: Car, label: '주차', value: parkVal })
  }
  if (post.fee_type)
    metaRows.push({
      icon: TicketCheck,
      label: '입장료',
      value: post.fee_amount ? `${post.fee_type} (${post.fee_amount})` : post.fee_type,
    })
  if (post.restroom)
    metaRows.push({ icon: Car, label: '화장실', value: post.restroom })
  if (post.safety)
    metaRows.push({ icon: Shield, label: '치안', value: post.safety })
  if (post.reservation)
    metaRows.push({ icon: Calendar, label: '예약', value: post.reservation })

  let photoIdx = 0

  return (
    <>
      <div className="flex flex-col h-full bg-white">
        {/* Header */}
        <header className="shrink-0 flex items-center gap-3 px-4 py-3 border-b border-gray-200">
          <button type="button" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-6 h-6 text-gray-700" />
          </button>
          <h1 className="text-lg font-bold">{placeName}</h1>
        </header>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">
          {/* Title */}
          <div className="px-4 pt-4 pb-2">
            <h2 className="text-lg font-bold text-gray-900">
              {post.title}
              {visibleComments.length > 0 && (
                <span className="ml-1.5 text-blue-500 text-base font-semibold">
                  ({visibleComments.length})
                </span>
              )}
            </h2>
          </div>

          {/* Author */}
          <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-100">
            <div className="w-9 h-9 rounded-full bg-gray-200" />
            <div className="flex-1 min-w-0">
              <button
                type="button"
                onClick={() => {
                  if (!isOwner && user && !post.is_anonymous) {
                    setBlockTarget({ id: post.user_id, nickname: post.author_nickname })
                  }
                }}
                className="text-sm font-semibold text-gray-900 text-left"
              >
                {displayNameInPost(post.author_nickname, post.is_anonymous, isAdminMode, { isPostAuthor: true })}
              </button>
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <span>{new Date(post.created_at).toLocaleString('ko-KR')}</span>
                <span>·</span>
                <span className="flex items-center gap-0.5">
                  <Eye className="w-3 h-3" />
                  {viewCount}
                </span>
              </div>
            </div>
            {/* 수정/삭제 메뉴 */}
            {(isOwner || isAdmin) && (
              <div className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => setShowPostMenu((v) => !v)}
                  className="p-1.5 text-gray-400 rounded-lg hover:bg-gray-100"
                >
                  <MoreVertical className="w-5 h-5" />
                </button>
                {showPostMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowPostMenu(false)} />
                    <div className="absolute right-0 top-full mt-1 z-50 bg-white rounded-xl shadow-lg border border-gray-200 py-1 w-32">
                      {isOwner && (
                        <button
                          type="button"
                          onClick={() => { setShowPostMenu(false); handleEditPost() }}
                          className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          <Pencil className="w-4 h-4" /> 수정
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => { setShowPostMenu(false); handleDeletePost() }}
                        disabled={deleting}
                        className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-red-500 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" /> 삭제
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Place banner */}
          {placeName && spotId && (
            <div className="px-4 pt-3">
              <Link
                to={`/spots/${spotId}`}
                className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-medium"
              >
                <MapPin className="w-3 h-3" />
                {placeName}
              </Link>
            </div>
          )}

          {/* Content blocks */}
          <div className="px-4 py-4">
            {blocks.map((block, i) => {
              if (block.type === 'photo') {
                const pi = photoIdx++
                return (
                  <button
                    key={i}
                    type="button"
                    className="w-full mb-3"
                    onClick={() => setViewerIndex(pi)}
                  >
                    <img
                      src={block.url}
                      alt={`사진 ${pi + 1}`}
                      className="w-full rounded-lg"
                    />
                  </button>
                )
              }
              if (!block.text?.trim()) return null
              return (
                <p
                  key={i}
                  className="text-sm text-gray-800 leading-relaxed whitespace-pre-line mb-4"
                >
                  {block.text}
                </p>
              )
            })}

            {/* YouTube 임베드 */}
            {youtubeVideos.length > 0 && (
              <div className="mt-2">
                {youtubeVideos.map((video) => (
                  <YouTubeEmbed key={video.videoId} videoId={video.videoId} />
                ))}
              </div>
            )}
          </div>

          {/* Meta info */}
          {(metaRows.length > 0 || post.categories.length > 0) && (
            <div className="mx-4 mb-4 bg-gray-50 rounded-xl p-4 space-y-2.5">
              {metaRows.map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-center gap-2 text-sm">
                  <Icon className="w-4 h-4 text-gray-400 shrink-0" />
                  <span className="text-gray-500 w-20 shrink-0">{label}</span>
                  <span className="text-gray-800">{value}</span>
                </div>
              ))}
              {post.categories.length > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <Tag className="w-4 h-4 text-gray-400 shrink-0" />
                  <span className="text-gray-500 w-20 shrink-0">카테고리</span>
                  <div className="flex gap-1.5 flex-wrap">
                    {post.categories.map((cat) => (
                      <span
                        key={cat}
                        className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full text-xs"
                      >
                        {cat}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Like & Report */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-b border-gray-100">
            <button
              type="button"
              onClick={toggleLike}
              disabled={!loggedIn || likeLoading}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium ${
                liked
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              <ThumbsUp className="w-4 h-4" />
              추천 {likeCount}
            </button>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => share(placeName, window.location.href)}
                className="flex items-center gap-1 text-sm text-gray-400"
              >
                <Share2 className="w-4 h-4" />
                공유
              </button>
              <button
                type="button"
                onClick={() => setReportOpen(true)}
                className="flex items-center gap-1 text-sm text-gray-400"
              >
                <Flag className="w-4 h-4" />
                신고
              </button>
            </div>
          </div>

          {/* Comments */}
          <div className="px-4 py-4">
            <h3 className="text-sm font-bold text-gray-900 mb-3">
              댓글 {visibleComments.length}
            </h3>
            {visibleComments.length === 0 ? (
              <p className="text-sm text-gray-400">아직 댓글이 없습니다.</p>
            ) : (
              <div className="space-y-3">
                {visibleComments.map((c) => {
                  const isMyComment = !!user && c.user_id === user.id
                  const isEditing = editingCommentId === c.id
                  const isByPostAuthor = c.user_id === post.user_id

                  return (
                    <div
                      key={c.id}
                      className={isByPostAuthor ? 'bg-gray-50 rounded-lg px-3 py-2' : ''}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <button
                          type="button"
                          onClick={() => {
                            if (!isMyComment && !c.is_anonymous) {
                              setBlockTarget({ id: c.user_id, nickname: c.author_nickname })
                            }
                          }}
                          className="text-sm font-semibold text-gray-800 text-left"
                        >
                          {displayNameInPost(c.author_nickname, c.is_anonymous, isAdminMode, {
                            isPostAuthor: isByPostAuthor,
                            anonNumber: anonMap.get(c.user_id),
                          })}
                        </button>
                        <span className="text-xs text-gray-400">
                          {new Date(c.created_at).toLocaleDateString('ko-KR')}
                        </span>
                        <div className="ml-auto flex items-center gap-1">
                          {isMyComment && !isEditing && (
                            <div className="relative">
                              <button
                                type="button"
                                onClick={() => setCommentMenuId(commentMenuId === c.id ? null : c.id)}
                                className="p-1 text-gray-300 rounded hover:bg-gray-100"
                              >
                                <MoreVertical className="w-3.5 h-3.5" />
                              </button>
                              {commentMenuId === c.id && (
                                <>
                                  <div className="fixed inset-0 z-40" onClick={() => setCommentMenuId(null)} />
                                  <div className="absolute right-0 top-full mt-1 z-50 bg-white rounded-xl shadow-lg border border-gray-200 py-1 w-24">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setCommentMenuId(null)
                                        setEditingCommentId(c.id)
                                        setEditCommentText(c.content)
                                      }}
                                      className="flex items-center gap-1.5 w-full px-3 py-2 text-xs text-gray-700 hover:bg-gray-50"
                                    >
                                      <Pencil className="w-3 h-3" /> 수정
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setCommentMenuId(null)
                                        handleDeleteComment(c.id)
                                      }}
                                      className="flex items-center gap-1.5 w-full px-3 py-2 text-xs text-red-500 hover:bg-red-50"
                                    >
                                      <Trash2 className="w-3 h-3" /> 삭제
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          )}
                          {!isMyComment && (
                            <button
                              type="button"
                              onClick={() => setReportOpen(true)}
                              className="text-gray-300"
                            >
                              <Flag className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                      {isEditing ? (
                        <div className="flex gap-2 items-end">
                          <textarea
                            value={editCommentText}
                            onChange={(e) => setEditCommentText(e.target.value)}
                            className="flex-1 text-sm px-3 py-2 bg-gray-100 rounded-lg outline-none resize-none"
                            rows={2}
                          />
                          <div className="flex flex-col gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleEditComment(c.id)}
                              disabled={!editCommentText.trim()}
                              className="px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg disabled:bg-gray-200 disabled:text-gray-400"
                            >
                              저장
                            </button>
                            <button
                              type="button"
                              onClick={() => { setEditingCommentId(null); setEditCommentText('') }}
                              className="px-3 py-1.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-lg"
                            >
                              취소
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-700">{c.content}</p>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Comment input */}
        {loggedIn ? (
          <div className="shrink-0 px-4 py-3 border-t border-gray-200 bg-white">
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="댓글을 입력하세요"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.nativeEvent.isComposing) submitComment()
                }}
                className="flex-1 text-sm px-3 py-2 bg-gray-100 rounded-lg outline-none"
              />
              <button
                type="button"
                onClick={submitComment}
                disabled={!commentText.trim() || commentSending}
                className="text-blue-600 disabled:text-gray-300"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
            <label className="inline-flex items-center gap-1.5 mt-2 text-xs text-gray-500 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={commentAnonymous}
                onChange={(e) => setCommentAnonymous(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              익명으로 작성
            </label>
          </div>
        ) : (
          <div className="shrink-0 px-4 py-3 border-t border-gray-200 bg-white">
            <p className="text-sm text-gray-400 text-center">
              로그인 후 댓글을 작성할 수 있습니다.
            </p>
          </div>
        )}
      </div>

      {/* Photo viewer overlay */}
      {viewerIndex !== null && (
        <PhotoViewer
          photos={photos}
          startIndex={viewerIndex}
          onClose={() => setViewerIndex(null)}
          exifData={(post as Post & { exif_data?: ExifData | null })?.exif_data}
        />
      )}

      {/* Report modal */}
      {reportOpen && user && post && (
        <ReportModal
          targetType="post"
          targetId={post.id}
          reporterId={user.id}
          onClose={() => setReportOpen(false)}
        />
      )}

      {/* Block popup */}
      {blockTarget && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setBlockTarget(null)} />
          <div className="relative w-full max-w-lg bg-white rounded-t-2xl px-5 pt-5 pb-6 space-y-3">
            <p className="text-base font-bold text-gray-900">{blockTarget.nickname}</p>
            <button
              type="button"
              onClick={async () => {
                await blockUser(blockTarget.id)
                setBlockTarget(null)
              }}
              className="w-full flex items-center gap-2 py-3 px-4 rounded-xl bg-red-50 text-red-500 text-sm font-medium"
            >
              <Ban className="w-4.5 h-4.5" />
              이 사용자 차단하기
            </button>
            <button
              type="button"
              onClick={() => setBlockTarget(null)}
              className="w-full py-2.5 rounded-xl bg-gray-100 text-gray-600 text-sm font-semibold"
            >
              취소
            </button>
          </div>
        </div>
      )}
    </>
  )
}
