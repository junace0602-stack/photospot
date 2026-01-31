import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FileText,
  MessageCircle,
  Star,
  ShieldBan,
  LogOut,
  UserX,
  ChevronRight,
  LogIn,
  Pencil,
  Shield,
  MessageSquarePlus,
  User,
  Bookmark,
  Clock,
  Moon,
  Camera,
  Info,
  Eye,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { supabase } from '../lib/supabase'
import { uploadImage, IMAGE_ACCEPT } from '../lib/imageUpload'

/* ── 후원 링크 ─────────────────────────────────────── */

const KAKAO_PAY_LINK = 'https://qr.kakaopay.com/FCiXkL947'

/* ── 통계 타입 ─────────────────────────────────────── */

interface UserStats {
  postsCount: number
  commentsCount: number
  receivedLikes: number
  favoritesCount: number
  likedPostsCount: number
  scrapsCount: number
}

/* ── 메뉴 아이템 컴포넌트 ─────────────────────────── */

function MenuItem({
  icon: Icon,
  label,
  count,
  onClick,
  variant = 'default',
}: {
  icon: typeof FileText
  label: string
  count?: number
  onClick: () => void
  variant?: 'default' | 'danger' | 'warning'
}) {
  const textColor = {
    default: 'text-gray-800',
    danger: 'text-red-500',
    warning: 'text-orange-600',
  }[variant]

  const iconColor = {
    default: 'text-gray-400',
    danger: 'text-red-400',
    warning: 'text-orange-500',
  }[variant]

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-gray-50 transition-colors"
    >
      <Icon className={`w-5 h-5 shrink-0 ${iconColor}`} />
      <span className={`flex-1 text-sm ${textColor}`}>{label}</span>
      {count !== undefined && (
        <span className="text-sm text-gray-400 font-medium">{count}</span>
      )}
      <ChevronRight className="w-4 h-4 text-gray-300" />
    </button>
  )
}

/* ── 섹션 헤더 ──────────────────────────────────────── */

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="px-4 pt-4 pb-2">
      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
        {title}
      </span>
    </div>
  )
}

/* ── 로그인 뷰 ─────────────────────────────────────── */

function LoggedInView() {
  const { logout, role, profile, user, isAdminMode, toggleAdminMode, refreshProfile } = useAuth()
  const { isDark, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const isAdmin = role === 'superadmin' || role === 'admin'

  const [stats, setStats] = useState<UserStats>({
    postsCount: 0,
    commentsCount: 0,
    receivedLikes: 0,
    favoritesCount: 0,
    likedPostsCount: 0,
    scrapsCount: 0,
  })

  // 통계 로드 (캐싱 적용)
  useEffect(() => {
    if (!user) return

    const CACHE_KEY = `mypage-stats-${user.id}`
    const CACHE_TTL = 60 * 1000 // 1분 캐시

    const loadStats = async () => {
      // 캐시 확인 (stale-while-revalidate 패턴)
      const cached = sessionStorage.getItem(CACHE_KEY)
      const cachedTime = sessionStorage.getItem(`${CACHE_KEY}-time`)

      if (cached && cachedTime) {
        const age = Date.now() - Number(cachedTime)
        if (age < CACHE_TTL) {
          // 캐시 유효: 즉시 표시
          setStats(JSON.parse(cached))
          return
        }
        // 캐시 만료: 일단 캐시 표시 후 백그라운드 갱신
        setStats(JSON.parse(cached))
      }

      // 병렬로 모든 통계 조회
      const [
        communityPostsRes,
        spotPostsRes,
        communityCommentsRes,
        spotCommentsRes,
        favoritesRes,
        communityLikesRes,
        spotLikesRes,
        scrapsRes,
      ] = await Promise.all([
        // 내가 쓴 커뮤니티 글
        supabase
          .from('community_posts')
          .select('likes_count')
          .eq('user_id', user.id),
        // 내가 쓴 출사지 글
        supabase
          .from('posts')
          .select('likes_count')
          .eq('user_id', user.id),
        // 내가 쓴 커뮤니티 댓글 수
        supabase
          .from('community_comments')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id),
        // 내가 쓴 출사지 댓글 수
        supabase
          .from('comments')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id),
        // 즐겨찾기 수
        supabase
          .from('favorites')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id),
        // 내가 추천한 커뮤니티 글 수
        supabase
          .from('community_likes')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id),
        // 내가 추천한 출사지 글 수
        supabase
          .from('likes')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id),
        // 스크랩 수
        supabase
          .from('scraps')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id),
      ])

      // 글 개수
      const communityPosts = communityPostsRes.data ?? []
      const spotPosts = spotPostsRes.data ?? []
      const postsCount = communityPosts.length + spotPosts.length

      // 받은 추천 수 합계
      const communityLikes = communityPosts.reduce((sum, p) => sum + (p.likes_count ?? 0), 0)
      const spotLikes = spotPosts.reduce((sum, p) => sum + (p.likes_count ?? 0), 0)
      const receivedLikes = communityLikes + spotLikes

      // 댓글 수
      const commentsCount = (communityCommentsRes.count ?? 0) + (spotCommentsRes.count ?? 0)

      // 즐겨찾기 수
      const favoritesCount = favoritesRes.count ?? 0

      // 내가 추천한 글 수
      const likedPostsCount = (communityLikesRes.count ?? 0) + (spotLikesRes.count ?? 0)

      // 스크랩 수
      const scrapsCount = scrapsRes.count ?? 0

      const newStats = {
        postsCount,
        commentsCount,
        receivedLikes,
        favoritesCount,
        likedPostsCount,
        scrapsCount,
      }

      // 캐시 저장
      sessionStorage.setItem(CACHE_KEY, JSON.stringify(newStats))
      sessionStorage.setItem(`${CACHE_KEY}-time`, String(Date.now()))

      setStats(newStats)
    }

    loadStats()
  }, [user])

  // 닉네임 수정
  const [editing, setEditing] = useState(false)
  const [editNickname, setEditNickname] = useState('')
  const [checking, setChecking] = useState(false)
  const [nickAvailable, setNickAvailable] = useState<boolean | null>(null)
  const [saving, setSaving] = useState(false)
  const [nicknameChangedAt, setNicknameChangedAt] = useState<string | null>(null)

  // 닉네임 변경 쿨타임 계산 (30일)
  const NICKNAME_COOLDOWN_DAYS = 30
  const cooldownInfo = (() => {
    if (!nicknameChangedAt) return { canChange: true, daysLeft: 0 }
    const changedDate = new Date(nicknameChangedAt)
    const now = new Date()
    const diffMs = now.getTime() - changedDate.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    const daysLeft = NICKNAME_COOLDOWN_DAYS - diffDays
    return { canChange: daysLeft <= 0, daysLeft: Math.max(0, daysLeft) }
  })()

  // 프로필에서 nickname_changed_at 로드
  useEffect(() => {
    if (!user) return
    const loadNicknameChangedAt = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('nickname_changed_at')
        .eq('id', user.id)
        .single()
      if (data) {
        setNicknameChangedAt(data.nickname_changed_at)
      }
    }
    loadNicknameChangedAt()
  }, [user])

  // 프로필 공개 설정
  const [isProfilePublic, setIsProfilePublic] = useState(profile?.is_profile_public ?? true)
  const [showProfilePublicInfo, setShowProfilePublicInfo] = useState(false)

  useEffect(() => {
    setIsProfilePublic(profile?.is_profile_public ?? true)
  }, [profile?.is_profile_public])

  const toggleProfilePublic = async () => {
    if (!user) return
    const newValue = !isProfilePublic
    setIsProfilePublic(newValue)
    const { error } = await supabase
      .from('profiles')
      .update({ is_profile_public: newValue })
      .eq('id', user.id)
    if (error) {
      setIsProfilePublic(!newValue)
      toast.error('설정 변경에 실패했습니다')
    }
  }

  // 프로필 사진 업로드
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return

    setUploadingAvatar(true)
    try {
      const url = await uploadImage(file)
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: url })
        .eq('id', user.id)
      if (error) throw error
      await refreshProfile()
      toast.success('프로필 사진이 변경되었습니다')
    } catch {
      toast.error('이미지 업로드에 실패했습니다')
    } finally {
      setUploadingAvatar(false)
      if (avatarInputRef.current) avatarInputRef.current.value = ''
    }
  }

  useEffect(() => {
    if (!editing) return
    const trimmed = editNickname.trim()
    if (trimmed.length < 2) {
      setNickAvailable(null)
      return
    }
    if (trimmed === profile?.nickname) {
      setNickAvailable(null)
      return
    }
    setChecking(true)
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id')
        .eq('nickname', trimmed)
        .neq('id', user?.id ?? '')
        .maybeSingle()
      setNickAvailable(!data)
      setChecking(false)
    }, 500)
    return () => {
      clearTimeout(timer)
      setChecking(false)
    }
  }, [editNickname, editing, profile?.nickname, user?.id])

  const startEdit = useCallback(() => {
    if (!cooldownInfo.canChange) {
      toast.error(`닉네임 변경까지 ${cooldownInfo.daysLeft}일 남았습니다.`)
      return
    }
    setEditNickname(profile?.nickname ?? '')
    setNickAvailable(null)
    setEditing(true)
  }, [profile?.nickname, cooldownInfo.canChange, cooldownInfo.daysLeft])

  const cancelEdit = useCallback(() => {
    setEditing(false)
    setEditNickname('')
    setNickAvailable(null)
  }, [])

  const saveNickname = async () => {
    const trimmed = editNickname.trim()
    if (!user || trimmed.length < 2 || nickAvailable !== true) return
    setSaving(true)

    const oldNickname = profile?.nickname ?? ''
    const now = new Date().toISOString()

    // 닉네임 변경 기록 저장
    if (oldNickname) {
      await supabase.from('nickname_history').insert({
        user_id: user.id,
        old_nickname: oldNickname,
        new_nickname: trimmed,
        changed_at: now,
      })
    }

    // 프로필 업데이트 (닉네임 + 변경일시)
    const { error } = await supabase
      .from('profiles')
      .update({ nickname: trimmed, nickname_changed_at: now })
      .eq('id', user.id)
    setSaving(false)
    if (error) {
      if (error.code === '23505') {
        setNickAvailable(false)
        return
      }
      toast.error('저장에 실패했습니다: ' + error.message)
      return
    }
    setNicknameChangedAt(now)
    await refreshProfile()
    setEditing(false)
    toast.success('닉네임이 변경되었습니다.')
  }

  const handleWithdraw = () => {
    toast('회원탈퇴는 support@photospot.com으로 문의해주세요.')
  }

  return (
    <div className="flex flex-col h-full bg-gray-100">
      {/* ── 프로필 카드 ── */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-700 px-4 pt-6 pb-8">
        {/* 프로필 정보 */}
        <div className="flex items-center gap-4">
          {/* 프로필 사진 (클릭하여 변경) */}
          <input
            ref={avatarInputRef}
            type="file"
            accept={IMAGE_ACCEPT}
            onChange={handleAvatarChange}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => avatarInputRef.current?.click()}
            disabled={uploadingAvatar}
            className="relative w-20 h-20 rounded-full bg-white/20 flex items-center justify-center border-2 border-white/40 overflow-hidden group"
          >
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt="프로필"
                className="w-full h-full object-cover"
              />
            ) : (
              <User className="w-10 h-10 text-white/80" />
            )}
            {/* 카메라 오버레이 */}
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              {uploadingAvatar ? (
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Camera className="w-6 h-6 text-white" />
              )}
            </div>
            {/* 모바일용 항상 표시되는 카메라 아이콘 */}
            <div className="absolute bottom-0 right-0 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-md">
              <Camera className="w-3.5 h-3.5 text-blue-600" />
            </div>
          </button>

          {editing ? (
            <div className="flex-1 min-w-0">
              <input
                type="text"
                value={editNickname}
                onChange={(e) => setEditNickname(e.target.value)}
                maxLength={12}
                placeholder="닉네임 (2~12자)"
                autoFocus
                className="w-full px-3 py-2 bg-white rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-300"
              />
              <p className="text-[10px] text-white/50 mt-1">
                닉네임은 30일에 한 번만 변경할 수 있습니다.
              </p>
              {checking && (
                <p className="text-xs text-white/70 mt-1">중복 확인 중...</p>
              )}
              {!checking && nickAvailable === true && (
                <p className="text-xs text-green-300 mt-1">사용 가능한 닉네임입니다.</p>
              )}
              {!checking && nickAvailable === false && (
                <p className="text-xs text-red-300 mt-1">이미 사용 중인 닉네임입니다.</p>
              )}
              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="px-3 py-1.5 bg-white/20 rounded-lg text-xs text-white"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={saveNickname}
                  disabled={nickAvailable !== true || saving}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                    nickAvailable === true
                      ? 'bg-white text-blue-600'
                      : 'bg-white/30 text-white/60'
                  }`}
                >
                  {saving ? '저장 중' : '저장'}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-xl font-bold text-white truncate">
                  {profile?.nickname ?? '사용자'}
                </p>
                {isAdminMode && (
                  <span className="px-2 py-0.5 bg-orange-400 text-white text-[10px] font-bold rounded-full">
                    관리자
                  </span>
                )}
              </div>
              <p className="text-sm text-white/70 mt-0.5 truncate">
                {user?.email ?? ''}
              </p>
              {cooldownInfo.canChange ? (
                <button
                  type="button"
                  onClick={startEdit}
                  className="mt-2 flex items-center gap-1 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-xs text-white transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  프로필 수정
                </button>
              ) : (
                <div className="mt-2">
                  <button
                    type="button"
                    disabled
                    className="flex items-center gap-1 px-3 py-1.5 bg-white/10 rounded-lg text-xs text-white/50 cursor-not-allowed"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    프로필 수정
                  </button>
                  <p className="text-[10px] text-white/50 mt-1">
                    다음 변경까지 {cooldownInfo.daysLeft}일 남음
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── 메뉴 영역 ── */}
      <div className="flex-1 overflow-y-auto -mt-4">
        <div className="bg-white rounded-t-3xl min-h-full">
          {/* 내 활동 섹션 */}
          <SectionHeader title="내 활동" />
          <div className="bg-white">
            <MenuItem
              icon={FileText}
              label="내가 쓴 글"
              count={stats.postsCount}
              onClick={() => navigate('/mypage/posts')}
            />
            <MenuItem
              icon={Bookmark}
              label="스크랩한 글"
              count={stats.scrapsCount}
              onClick={() => navigate('/mypage/scraps')}
            />
            <MenuItem
              icon={MessageCircle}
              label="댓글 단 글"
              onClick={() => navigate('/mypage/commented')}
            />
            <MenuItem
              icon={Clock}
              label="최근 본 글"
              onClick={() => navigate('/mypage/recent')}
            />
            <MenuItem
              icon={Star}
              label="즐겨찾기 (출사지)"
              count={stats.favoritesCount}
              onClick={() => navigate('/mypage/favorites')}
            />
          </div>
          <div className="h-2 bg-gray-100" />

          {/* 설정 섹션 */}
          <SectionHeader title="설정" />
          <div className="bg-white">
            {/* 다크 모드 토글 */}
            <button
              type="button"
              onClick={toggleTheme}
              className="w-full flex items-center justify-between px-4 py-3.5 text-left hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Moon className="w-5 h-5 text-gray-400 shrink-0" />
                <span className="text-sm text-gray-800">다크 모드</span>
              </div>
              <div
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  isDark ? 'bg-blue-600' : 'bg-gray-300'
                }`}
              >
                <div
                  className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                    isDark ? 'translate-x-[22px]' : 'translate-x-0.5'
                  }`}
                />
              </div>
            </button>
            {/* 작성글 공개 토글 */}
            <div className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-3">
                <Eye className="w-5 h-5 text-gray-400 shrink-0" />
                <span className="text-sm text-gray-800">작성글 공개</span>
                <button
                  type="button"
                  onClick={() => setShowProfilePublicInfo(true)}
                  className="p-0.5 text-gray-300 hover:text-gray-400"
                >
                  <Info className="w-4 h-4" />
                </button>
              </div>
              <button
                type="button"
                onClick={toggleProfilePublic}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  isProfilePublic ? 'bg-blue-600' : 'bg-gray-300'
                }`}
              >
                <div
                  className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                    isProfilePublic ? 'translate-x-[22px]' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
            {/* 작성글 공개 안내 모달 */}
            {showProfilePublicInfo && (
              <>
                <div
                  className="fixed inset-0 bg-black/50 z-50"
                  onClick={() => setShowProfilePublicInfo(false)}
                />
                <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white rounded-2xl p-5 w-[85%] max-w-xs">
                  <h3 className="font-bold text-gray-900 mb-2">작성글 공개 설정</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    다른 사람이 회원님의 닉네임을 클릭했을 때 회원님이 작성한 글을 볼 수 있는지 설정합니다.
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowProfilePublicInfo(false)}
                    className="mt-4 w-full py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl"
                  >
                    확인
                  </button>
                </div>
              </>
            )}
            <MenuItem
              icon={ShieldBan}
              label="차단 목록"
              onClick={() => navigate('/mypage/blocked')}
            />
          </div>
          <div className="h-2 bg-gray-100" />

          {/* 기타 섹션 */}
          <SectionHeader title="기타" />
          <div className="bg-white">
            <MenuItem
              icon={MessageSquarePlus}
              label="건의하기"
              onClick={() => navigate('/feedback')}
            />

            {/* 관리자 전용 */}
            {isAdmin && (
              <>
                {isAdminMode && (
                  <MenuItem
                    icon={Shield}
                    label="관리자 페이지"
                    onClick={() => navigate('/admin')}
                    variant="warning"
                  />
                )}
                <button
                  type="button"
                  onClick={toggleAdminMode}
                  className="w-full flex items-center justify-between px-4 py-3.5 text-left hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    <Shield className="w-5 h-5 text-gray-400 shrink-0" />
                    <span className="text-sm text-gray-800">관리자 모드</span>
                  </div>
                  <div
                    className={`relative w-11 h-6 rounded-full transition-colors ${
                      isAdminMode ? 'bg-orange-500' : 'bg-gray-300'
                    }`}
                  >
                    <div
                      className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                        isAdminMode ? 'translate-x-[22px]' : 'translate-x-0.5'
                      }`}
                    />
                  </div>
                </button>
              </>
            )}

            <MenuItem
              icon={LogOut}
              label="로그아웃"
              onClick={() => logout()}
            />
            <MenuItem
              icon={UserX}
              label="회원탈퇴"
              onClick={handleWithdraw}
              variant="danger"
            />
          </div>

          {/* 후원하기 섹션 */}
          <div className="mx-4 mt-4 mb-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-4">
              <h3 className="text-base font-bold text-gray-900 mb-3">☕ 후원하기</h3>
              <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
                {'후원금은 서버 유지 및 기능 개선에 사용됩니다.\n작은 후원이 큰 도움이 됩니다. 감사합니다!'}
              </p>
              <div className="mt-4">
                <a
                  href={KAKAO_PAY_LINK}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full py-3 bg-yellow-400 hover:bg-yellow-500 text-yellow-900 rounded-xl text-sm font-semibold text-center transition-colors"
                >
                  💛 카카오페이로 후원하기
                </a>
              </div>

              {/* 계좌이체 */}
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-400 text-center mb-2">또는 계좌이체</p>
                <div className="flex items-center justify-center gap-2 bg-gray-50 rounded-xl px-4 py-3">
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-800">우리은행 1002161964549</p>
                    <p className="text-xs text-gray-500 mt-0.5">예금주: 유예준</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText('1002161964549')
                      toast.success('계좌번호가 복사되었습니다')
                    }}
                    className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                    title="계좌번호 복사"
                  >
                    <span className="text-base">📋</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 하단 약관 링크 */}
          <div className="py-6 bg-gray-100 flex justify-center">
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <button type="button" onClick={() => navigate('/rules')} className="hover:text-gray-500">
                커뮤니티 가이드
              </button>
              <span>|</span>
              <button type="button" onClick={() => navigate('/terms')} className="hover:text-gray-500">
                이용약관
              </button>
              <span>|</span>
              <button type="button" onClick={() => navigate('/privacy')} className="hover:text-gray-500">
                개인정보처리방침
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── 로그아웃 뷰 ───────────────────────────────────── */

function LoggedOutView() {
  const navigate = useNavigate()

  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 px-8 bg-gray-50">
      <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center">
        <LogIn className="w-10 h-10 text-gray-400" />
      </div>
      <p className="text-gray-500 text-sm">로그인이 필요합니다</p>
      <button
        type="button"
        onClick={() => navigate('/login')}
        className="w-full max-w-xs py-3 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors"
      >
        로그인
      </button>
    </div>
  )
}

/* ── 메인 ─────────────────────────────────────────── */

export default function MyPage() {
  const { loggedIn } = useAuth()

  return loggedIn ? <LoggedInView /> : <LoggedOutView />
}
