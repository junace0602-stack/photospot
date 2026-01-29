import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, MessageCircle, TrendingUp, Reply, Settings, ChevronDown, ChevronUp, Crown, Gift, X, Download } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

interface Notification {
  id: string
  type: string
  message: string
  link: string
  is_read: boolean
  created_at: string
  image_url?: string | null
  metadata?: string | null
}

interface NotificationSettings {
  notify_comment: boolean
  notify_reply: boolean
  notify_like: boolean
}

/* ── 토글 컴포넌트 ───────────────────────────────── */

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`relative w-11 h-6 rounded-full transition-colors ${
        on ? 'bg-blue-600' : 'bg-gray-300'
      }`}
    >
      <div
        className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
          on ? 'translate-x-[22px]' : 'translate-x-0.5'
        }`}
      />
    </button>
  )
}

/* ── 연락처 입력 모달 ────────────────────────────── */

function ContactInputModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void
  onSubmit: (contact: string) => Promise<void>
}) {
  const [contactType, setContactType] = useState<'email' | 'phone'>('email')
  const [contact, setContact] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!contact.trim()) return
    setSubmitting(true)
    await onSubmit(contact.trim())
    setSubmitting(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-[90%] max-w-sm bg-white rounded-2xl p-5">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-4">
          <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
            <Gift className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900">상품 수령 정보</h3>
            <p className="text-xs text-gray-500">기프티콘 전송을 위해 연락처를 입력해주세요</p>
          </div>
        </div>

        <div className="flex gap-2 mb-3">
          <button
            type="button"
            onClick={() => setContactType('email')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium ${
              contactType === 'email' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            이메일
          </button>
          <button
            type="button"
            onClick={() => setContactType('phone')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium ${
              contactType === 'phone' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            전화번호
          </button>
        </div>

        <input
          type={contactType === 'email' ? 'email' : 'tel'}
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          placeholder={contactType === 'email' ? 'example@email.com' : '010-1234-5678'}
          className="w-full px-4 py-3 bg-gray-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-200"
        />

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!contact.trim() || submitting}
          className={`w-full mt-4 py-3 rounded-xl text-sm font-semibold ${
            contact.trim() && !submitting ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-400'
          }`}
        >
          {submitting ? '저장 중...' : '연락처 저장'}
        </button>
      </div>
    </div>
  )
}

/* ── 이미지 뷰어 모달 ────────────────────────────── */

function ImageViewerModal({
  imageUrl,
  onClose,
}: {
  imageUrl: string
  onClose: () => void
}) {
  const downloadImage = async () => {
    try {
      const response = await fetch(imageUrl)
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `gifticon_${Date.now()}.jpg`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch {
      toast.error('다운로드에 실패했습니다.')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90">
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 text-white z-10"
      >
        <X className="w-6 h-6" />
      </button>

      <img
        src={imageUrl}
        alt="기프티콘"
        className="max-w-full max-h-[80vh] object-contain"
      />

      <button
        type="button"
        onClick={downloadImage}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 px-6 py-3 bg-white rounded-xl text-sm font-semibold text-gray-800"
      >
        <Download className="w-4 h-4" />
        이미지 저장
      </button>
    </div>
  )
}

/* ── 메인 컴포넌트 ───────────────────────────────── */

export default function NotificationsPage() {
  const navigate = useNavigate()
  const { user, loggedIn } = useAuth()
  const [items, setItems] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  // 설정 섹션 펼침 상태
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settings, setSettings] = useState<NotificationSettings>({
    notify_comment: true,
    notify_reply: true,
    notify_like: true,
  })
  const [settingsLoading, setSettingsLoading] = useState(true)

  // 모달 상태
  const [contactModal, setContactModal] = useState<{ challengeId: string; notificationId: string } | null>(null)
  const [imageViewer, setImageViewer] = useState<string | null>(null)

  // 알림 목록 로드
  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }
    supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setItems((data ?? []) as Notification[])
        setLoading(false)
      })
  }, [user])

  // 알림 설정 로드
  useEffect(() => {
    if (!user) {
      setSettingsLoading(false)
      return
    }
    supabase
      .from('user_settings')
      .select('notify_comment, notify_reply, notify_like')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setSettings({
            notify_comment: data.notify_comment ?? true,
            notify_reply: data.notify_reply ?? true,
            notify_like: data.notify_like ?? true,
          })
        }
        setSettingsLoading(false)
      })
  }, [user])

  // 설정 저장
  const saveSetting = useCallback(async (field: keyof NotificationSettings, value: boolean) => {
    if (!user) return

    const { data: existing } = await supabase
      .from('user_settings')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (existing) {
      await supabase
        .from('user_settings')
        .update({ [field]: value })
        .eq('user_id', user.id)
    } else {
      await supabase.from('user_settings').insert({
        user_id: user.id,
        notify_comment: field === 'notify_comment' ? value : settings.notify_comment,
        notify_reply: field === 'notify_reply' ? value : settings.notify_reply,
        notify_like: field === 'notify_like' ? value : settings.notify_like,
      })
    }
  }, [user, settings])

  const handleToggle = (field: keyof NotificationSettings) => {
    const next = !settings[field]
    setSettings((prev) => ({ ...prev, [field]: next }))
    saveSetting(field, next)
  }

  const handleClick = async (item: Notification) => {
    // 읽음 처리
    if (!item.is_read) {
      await supabase.from('notifications').update({ is_read: true }).eq('id', item.id)
      setItems((p) => p.map((n) => (n.id === item.id ? { ...n, is_read: true } : n)))
    }

    // 우승자 알림이고 상품이 있는 경우 연락처 입력 모달
    if (item.type === 'winner' && item.metadata) {
      try {
        const meta = JSON.parse(item.metadata)
        if (meta.has_prize && meta.challenge_id) {
          // 이미 연락처를 입력했는지 확인
          const { data: winnerData } = await supabase
            .from('challenge_winners')
            .select('contact_info')
            .eq('challenge_id', meta.challenge_id)
            .eq('user_id', user?.id ?? '')
            .maybeSingle()

          if (!winnerData?.contact_info) {
            setContactModal({ challengeId: meta.challenge_id, notificationId: item.id })
            return
          }
        }
      } catch {
        // JSON 파싱 실패 시 무시
      }
    }

    // 이미지가 있는 알림 (기프티콘)
    if (item.type === 'prize' && item.image_url) {
      setImageViewer(item.image_url)
      return
    }

    // 일반 알림은 링크로 이동
    navigate(item.link)
  }

  // 연락처 저장
  const saveContact = async (contact: string) => {
    if (!contactModal || !user) return

    await supabase
      .from('challenge_winners')
      .update({ contact_info: contact })
      .eq('challenge_id', contactModal.challengeId)
      .eq('user_id', user.id)

    setContactModal(null)
    toast.success('연락처가 저장되었습니다. 상품이 곧 전달됩니다!')
  }

  const markAllRead = async () => {
    if (!user) return
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false)
    setItems((p) => p.map((n) => ({ ...n, is_read: true })))
  }

  const unreadCount = items.filter((n) => !n.is_read).length

  const getIcon = (type: string) => {
    switch (type) {
      case 'comment':
        return <MessageCircle className="w-4.5 h-4.5 text-blue-600" />
      case 'reply':
        return <Reply className="w-4.5 h-4.5 text-green-600" />
      case 'like':
      case 'popular':
        return <TrendingUp className="w-4.5 h-4.5 text-orange-500" />
      case 'winner':
        return <Crown className="w-4.5 h-4.5 text-amber-500" />
      case 'prize':
        return <Gift className="w-4.5 h-4.5 text-pink-500" />
      default:
        return <MessageCircle className="w-4.5 h-4.5 text-gray-500" />
    }
  }

  const getIconBg = (type: string) => {
    switch (type) {
      case 'comment':
        return 'bg-blue-100'
      case 'reply':
        return 'bg-green-100'
      case 'like':
      case 'popular':
        return 'bg-orange-100'
      case 'winner':
        return 'bg-amber-100'
      case 'prize':
        return 'bg-pink-100'
      default:
        return 'bg-gray-100'
    }
  }

  // 비로그인 상태
  if (!loggedIn) {
    return (
      <div className="flex flex-col h-full bg-gray-50">
        <header className="shrink-0 flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-200">
          <button type="button" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-6 h-6 text-gray-700" />
          </button>
          <h1 className="text-lg font-bold">알림</h1>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-sm text-gray-500 mb-4">로그인이 필요합니다</p>
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold"
            >
              로그인
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <header className="shrink-0 flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-200">
        <button type="button" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-6 h-6 text-gray-700" />
        </button>
        <h1 className="flex-1 text-lg font-bold">알림</h1>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={markAllRead}
            className="text-xs text-blue-600 font-medium"
          >
            모두 읽음
          </button>
        )}
      </header>

      <div className="flex-1 overflow-y-auto">
        {/* 알림 설정 섹션 */}
        <div className="bg-white border-b border-gray-200">
          <button
            type="button"
            onClick={() => setSettingsOpen((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-3"
          >
            <div className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-gray-500" />
              <span className="text-sm font-semibold text-gray-800">알림 설정</span>
            </div>
            {settingsOpen ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </button>

          {settingsOpen && !settingsLoading && (
            <div className="px-4 pb-4 space-y-3">
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm text-gray-700">댓글 알림</p>
                  <p className="text-xs text-gray-400">내 글에 댓글이 달리면 알림</p>
                </div>
                <Toggle on={settings.notify_comment} onToggle={() => handleToggle('notify_comment')} />
              </div>
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm text-gray-700">답글 알림</p>
                  <p className="text-xs text-gray-400">내 댓글에 답글이 달리면 알림</p>
                </div>
                <Toggle on={settings.notify_reply} onToggle={() => handleToggle('notify_reply')} />
              </div>
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm text-gray-700">추천 알림</p>
                  <p className="text-xs text-gray-400">내 글이 추천을 받으면 알림</p>
                </div>
                <Toggle on={settings.notify_like} onToggle={() => handleToggle('notify_like')} />
              </div>
            </div>
          )}
        </div>

        {/* 알림 목록 */}
        {loading ? (
          <p className="text-center text-sm text-gray-400 py-10">불러오는 중...</p>
        ) : items.length === 0 ? (
          <p className="text-center text-sm text-gray-400 py-10">알림이 없습니다.</p>
        ) : (
          <div>
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleClick(item)}
                className={`w-full flex items-start gap-3 px-4 py-3.5 text-left border-b border-gray-100 transition-colors ${
                  item.is_read ? 'bg-white' : 'bg-blue-50'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${getIconBg(item.type)}`}
                >
                  {getIcon(item.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm leading-snug ${
                      item.is_read ? 'text-gray-600' : 'text-gray-900 font-semibold'
                    }`}
                  >
                    {item.message}
                  </p>
                  {/* 이미지 미리보기 (기프티콘) */}
                  {item.image_url && (
                    <div className="mt-2">
                      <img
                        src={item.image_url}
                        alt="첨부 이미지"
                        className="w-20 h-20 rounded-lg object-cover border border-gray-200"
                      />
                    </div>
                  )}
                  <p className="text-xs text-gray-400 mt-1">
                    {formatTime(item.created_at)}
                  </p>
                </div>
                {!item.is_read && (
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0 mt-1.5" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 연락처 입력 모달 */}
      {contactModal && (
        <ContactInputModal
          onClose={() => setContactModal(null)}
          onSubmit={saveContact}
        />
      )}

      {/* 이미지 뷰어 모달 */}
      {imageViewer && (
        <ImageViewerModal
          imageUrl={imageViewer}
          onClose={() => setImageViewer(null)}
        />
      )}
    </div>
  )
}

function formatTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return '방금 전'
  if (mins < 60) return `${mins}분 전`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}시간 전`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}일 전`
  return new Date(iso).toLocaleDateString('ko-KR')
}
