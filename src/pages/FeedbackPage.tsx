import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ImagePlus, X, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

const CATEGORIES = ['오류 제보', '기능 건의', '기타'] as const
type Category = (typeof CATEGORIES)[number]

export default function FeedbackPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [category, setCategory] = useState<Category | ''>('')
  const [content, setContent] = useState('')
  const [email, setEmail] = useState('')
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const canSubmit = !!category && content.trim().length > 0 && !submitting && !uploading

  const handleScreenshot = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)

    const path = `feedback/${crypto.randomUUID()}.${file.name.split('.').pop()}`
    const { error } = await supabase.storage
      .from('images')
      .upload(path, file, { contentType: file.type })

    if (error) {
      toast.error('이미지 업로드에 실패했습니다.')
      setUploading(false)
      return
    }

    const { data } = supabase.storage.from('images').getPublicUrl(path)
    setScreenshotUrl(data.publicUrl)
    setUploading(false)
    e.target.value = ''
  }

  const handleSubmit = async () => {
    if (!canSubmit || !user) return
    setSubmitting(true)

    const { error } = await supabase.from('feedback').insert({
      user_id: user.id,
      category,
      content: content.trim(),
      screenshot_url: screenshotUrl,
      email: email.trim() || null,
    })

    setSubmitting(false)

    if (error) {
      toast.error('건의 접수에 실패했습니다: ' + error.message)
      return
    }

    toast.success('소중한 의견 감사합니다.')
    navigate(-1)
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <header className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-6 h-6 text-gray-700" />
          </button>
          <h1 className="text-lg font-bold">건의하기</h1>
        </div>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className={`px-4 py-1.5 rounded-lg text-sm font-semibold ${
            canSubmit ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-400'
          }`}
        >
          {submitting ? '제출 중...' : '제출'}
        </button>
      </header>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-6">
        {/* Category */}
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">카테고리</p>
          <div className="flex gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`px-4 py-2 rounded-full text-sm font-medium ${
                  category === cat
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">
            내용 <span className="text-red-400">*</span>
          </p>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="건의할 내용을 자유롭게 작성해주세요"
            className="w-full h-40 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none resize-none focus:border-blue-400"
          />
        </div>

        {/* Screenshot */}
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">스크린샷 (선택)</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleScreenshot}
            className="hidden"
          />
          {screenshotUrl ? (
            <div className="relative inline-block">
              <img
                src={screenshotUrl}
                alt="스크린샷"
                className="w-40 h-40 object-cover rounded-xl border border-gray-200"
              />
              <button
                type="button"
                onClick={() => setScreenshotUrl(null)}
                className="absolute -top-2 -right-2 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center"
              >
                <X className="w-3.5 h-3.5 text-white" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-2 px-4 py-3 bg-gray-50 border border-dashed border-gray-300 rounded-xl text-sm text-gray-500"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  업로드 중...
                </>
              ) : (
                <>
                  <ImagePlus className="w-5 h-5" />
                  이미지 첨부
                </>
              )}
            </button>
          )}
        </div>

        {/* Email */}
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">연락받을 이메일 (선택)</p>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="답변을 받을 이메일 주소"
            className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-blue-400"
          />
        </div>
      </div>
    </div>
  )
}
