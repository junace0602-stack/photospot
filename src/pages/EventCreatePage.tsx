import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ImagePlus, X, Loader2, Gift } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { uploadImage, IMAGE_ACCEPT } from '../lib/imageUpload'

export default function EventCreatePage() {
  const navigate = useNavigate()
  const { loggedIn, loading: authLoading, user, profile, isAdminMode } = useAuth()

  const [title, setTitle] = useState('')
  const [topic, setTopic] = useState('')
  const [description, setDescription] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [winnerCriteria, setWinnerCriteria] = useState('')
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null)
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null)

  // 상품 관련
  const [hasPrize, setHasPrize] = useState(true)
  const [prizeName, setPrizeName] = useState('')
  const [prizeImageFile, setPrizeImageFile] = useState<File | null>(null)
  const [prizeImagePreview, setPrizeImagePreview] = useState<string | null>(null)

  const [submitting, setSubmitting] = useState(false)

  // 비로그인 시 리다이렉트
  useEffect(() => {
    if (!authLoading && !loggedIn) {
      navigate('/login', { replace: true })
    }
  }, [authLoading, loggedIn, navigate])

  const handleThumbnail = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setThumbnailFile(file)
    setThumbnailPreview(URL.createObjectURL(file))
  }

  const removeThumbnail = () => {
    if (thumbnailPreview) URL.revokeObjectURL(thumbnailPreview)
    setThumbnailFile(null)
    setThumbnailPreview(null)
  }

  const handlePrizeImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPrizeImageFile(file)
    setPrizeImagePreview(URL.createObjectURL(file))
  }

  const removePrizeImage = () => {
    if (prizeImagePreview) URL.revokeObjectURL(prizeImagePreview)
    setPrizeImageFile(null)
    setPrizeImagePreview(null)
  }

  const canSubmit =
    title.trim() &&
    topic.trim() &&
    description.trim() &&
    startDate &&
    endDate &&
    winnerCriteria.trim() &&
    (!hasPrize || prizeName.trim()) &&
    !submitting

  const handleSubmit = async () => {
    if (!canSubmit || !user || !profile) return
    setSubmitting(true)

    try {
      let thumbnailUrl: string | null = null
      if (thumbnailFile) {
        thumbnailUrl = await uploadImage(thumbnailFile)
      }

      let prizeImageUrl: string | null = null
      if (hasPrize && prizeImageFile) {
        prizeImageUrl = await uploadImage(prizeImageFile)
      }

      const { error } = await supabase.from('events').insert({
        user_id: user.id,
        author_nickname: profile.nickname,
        title: title.trim(),
        topic: topic.trim(),
        description: description.trim(),
        start_date: startDate,
        end_date: endDate,
        winner_criteria: winnerCriteria.trim(),
        has_prize: hasPrize,
        prize: hasPrize ? prizeName.trim() : null,
        prize_image_url: prizeImageUrl,
        thumbnail_url: thumbnailUrl,
        is_official: isAdminMode,
        status: 'approved', // 승인 과정 없이 바로 게시
      })

      if (error) throw error

      navigate('/list', { replace: true })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : JSON.stringify(err)
      toast.error(`챌린지 생성에 실패했습니다: ${msg}`)
    } finally {
      setSubmitting(false)
    }
  }

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen text-sm text-gray-400">
        로딩 중...
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* 헤더 */}
      <header className="shrink-0 flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-200">
        <button type="button" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-6 h-6 text-gray-700" />
        </button>
        <h1 className="text-lg font-bold">챌린지 만들기</h1>
        {isAdminMode && (
          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
            공식
          </span>
        )}
      </header>

      {/* 폼 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* 제목 */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            챌린지 제목 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="예: 2월 겨울 풍경 챌린지"
            className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:border-blue-400"
          />
        </div>

        {/* 주제 */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            주제 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="예: 겨울 풍경, 일출 사진"
            className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:border-blue-400"
          />
        </div>

        {/* 설명 */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            챌린지 설명 <span className="text-red-500">*</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="챌린지에 대한 상세 설명을 입력해주세요"
            rows={4}
            className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm outline-none resize-none focus:border-blue-400"
          />
        </div>

        {/* 썸네일 */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            썸네일 이미지
          </label>
          {thumbnailPreview ? (
            <div className="relative inline-block">
              <img
                src={thumbnailPreview}
                alt=""
                className="w-32 h-32 object-cover rounded-xl"
              />
              <button
                type="button"
                onClick={removeThumbnail}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <label className="inline-flex flex-col items-center justify-center w-32 h-32 bg-white border border-gray-200 rounded-xl cursor-pointer text-gray-400">
              <ImagePlus className="w-6 h-6" />
              <span className="text-xs mt-1">이미지 추가</span>
              <input
                type="file"
                accept={IMAGE_ACCEPT}
                onChange={handleThumbnail}
                className="hidden"
              />
            </label>
          )}
        </div>

        {/* 기간 */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              시작일 <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:border-blue-400"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              종료일 <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:border-blue-400"
            />
          </div>
        </div>

        {/* 우승 기준 */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            우승 기준 설명 <span className="text-red-500">*</span>
          </label>
          <textarea
            value={winnerCriteria}
            onChange={(e) => setWinnerCriteria(e.target.value)}
            placeholder="예: 추천수 1위 게시물이 우승합니다 / 주최자가 가장 마음에 드는 작품을 선정합니다"
            rows={2}
            className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm outline-none resize-none focus:border-blue-400"
          />
        </div>

        {/* 상품 유무 */}
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Gift className="w-5 h-5 text-orange-500" />
              <span className="text-sm font-semibold text-gray-700">상품 제공</span>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setHasPrize(true)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                  hasPrize ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
                }`}
              >
                있음
              </button>
              <button
                type="button"
                onClick={() => setHasPrize(false)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                  !hasPrize ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
                }`}
              >
                없음
              </button>
            </div>
          </div>

          {hasPrize && (
            <div className="space-y-3 pt-3 border-t border-gray-100">
              {/* 상품명 */}
              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  상품명 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={prizeName}
                  onChange={(e) => setPrizeName(e.target.value)}
                  placeholder="예: 스타벅스 아메리카노 기프티콘"
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-400"
                />
              </div>

              {/* 기프티콘 이미지 */}
              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  기프티콘 이미지 (선택)
                </label>
                <p className="text-xs text-gray-400 mb-2">
                  우승자에게 전달할 기프티콘 이미지를 미리 첨부할 수 있습니다
                </p>
                {prizeImagePreview ? (
                  <div className="relative inline-block">
                    <img
                      src={prizeImagePreview}
                      alt=""
                      className="w-24 h-24 object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={removePrizeImage}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <label className="inline-flex flex-col items-center justify-center w-24 h-24 bg-gray-50 border border-gray-200 rounded-lg cursor-pointer text-gray-400">
                    <Gift className="w-5 h-5" />
                    <span className="text-[10px] mt-1">기프티콘</span>
                    <input
                      type="file"
                      accept={IMAGE_ACCEPT}
                      onChange={handlePrizeImage}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 제출 버튼 */}
      <div className="shrink-0 px-4 py-3 bg-white border-t border-gray-200">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className={`w-full py-3 rounded-xl text-sm font-semibold ${
            canSubmit ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-400'
          }`}
        >
          {submitting ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              생성 중...
            </span>
          ) : (
            '챌린지 만들기'
          )}
        </button>
      </div>
    </div>
  )
}
