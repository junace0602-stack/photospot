import { useState } from 'react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'

const REASONS = [
  '허위 정보',
  '광고/홍보',
  '욕설/비방',
  '도배',
  '일베/고인모독/지역비하',
  '분탕/커뮤니티 분위기 저해',
  '기타',
] as const

interface ReportModalProps {
  targetType: 'community_post' | 'post' | 'community_comment' | 'comment'
  targetId: string
  reporterId: string
  onClose: () => void
}

export default function ReportModal({ targetType, targetId, reporterId, onClose }: ReportModalProps) {
  const [reason, setReason] = useState('')
  const [detail, setDetail] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const canSubmit = reason && (reason !== '기타' || detail.trim()) && !submitting

  const handleSubmit = async () => {
    if (!canSubmit) return
    setSubmitting(true)

    // 허위 신고 누적 체크
    const { data: profile } = await supabase
      .from('profiles')
      .select('false_report_count')
      .eq('id', reporterId)
      .single()

    if (profile) {
      if (profile.false_report_count >= 20) {
        toast.error('계정이 정지되었습니다.')
        setSubmitting(false)
        return
      }
      if (profile.false_report_count >= 10) {
        toast.error('허위 신고 누적으로 신고 기능이 정지되었습니다.')
        setSubmitting(false)
        return
      }
    }

    // 중복 신고 체크
    const { data: existing } = await supabase
      .from('reports')
      .select('id')
      .eq('target_type', targetType)
      .eq('target_id', targetId)
      .eq('reporter_id', reporterId)
      .maybeSingle()

    if (existing) {
      toast('이미 신고한 항목입니다.')
      setSubmitting(false)
      onClose()
      return
    }

    // 신고 저장
    const { error } = await supabase.from('reports').insert({
      target_type: targetType,
      target_id: targetId,
      reporter_id: reporterId,
      reason,
      detail: reason === '기타' ? detail.trim() : null,
    })

    if (error) {
      toast.error('신고 접수에 실패했습니다.')
      setSubmitting(false)
      return
    }

    // 신고 횟수 확인 → 3회 이상이면 자동 숨김
    const { count } = await supabase
      .from('reports')
      .select('*', { count: 'exact', head: true })
      .eq('target_type', targetType)
      .eq('target_id', targetId)

    if (count && count >= 3) {
      const table =
        targetType === 'community_post' ? 'community_posts'
          : targetType === 'post' ? 'posts'
          : targetType === 'community_comment' ? 'community_comments'
          : 'comments'
      await supabase.from(table).update({ hidden: true }).eq('id', targetId)
    }

    toast.success('신고가 접수되었습니다.')
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white rounded-t-2xl px-5 pt-5 pb-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">신고하기</h2>

        <div className="space-y-3">
          {REASONS.map((r) => (
            <label key={r} className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                name="report-reason"
                checked={reason === r}
                onChange={() => setReason(r)}
                className="w-4.5 h-4.5 accent-blue-600"
              />
              <span className="text-sm text-gray-800">{r}</span>
            </label>
          ))}
        </div>

        {reason === '기타' && (
          <textarea
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            placeholder="신고 사유를 입력해주세요"
            className="w-full mt-3 px-3 py-2.5 bg-gray-100 rounded-lg text-sm outline-none resize-none h-24"
          />
        )}

        <div className="flex gap-3 mt-5">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-gray-100 text-gray-600"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold ${
              canSubmit
                ? 'bg-red-500 text-white'
                : 'bg-gray-200 text-gray-400'
            }`}
          >
            {submitting ? '처리 중...' : '신고하기'}
          </button>
        </div>
      </div>
    </div>
  )
}
