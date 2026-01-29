import { useState } from 'react'
import { X } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

/* ── 약관 내용 (TermsPage.tsx에서 가져옴) ────────────── */

const TERMS_CONTENT = `
제1조 (서비스 소개)
"출사지도"(이하 "서비스")는 사진 촬영 장소를 공유하고 소통하는 커뮤니티 플랫폼입니다. 이용자는 출사지 정보, 사진, 촬영 팁 등을 공유하고 다른 이용자와 교류할 수 있습니다.

제2조 (회원가입 및 탈퇴)
1. 회원가입은 카카오 계정을 통해 진행되며, 닉네임 설정 후 서비스 이용이 가능합니다.
2. 회원은 언제든지 서비스 내에서 탈퇴를 요청할 수 있습니다.
3. 탈퇴 시 회원 정보는 즉시 삭제되며, 작성한 게시물은 별도 요청 시 삭제됩니다.

제3조 (이용자의 의무)
이용자는 다음 행위를 해서는 안 됩니다:
• 불법 촬영물, 음란물 등 불법 콘텐츠 게시
• 타인을 비방하거나 명예를 훼손하는 행위
• 허위 정보 유포 또는 사기 행위
• 서비스 운영을 방해하는 행위
• 타인의 개인정보를 무단으로 수집하거나 유포하는 행위
• 영리 목적의 광고, 스팸 게시

제4조 (게시물의 권리 및 책임)
1. 게시물에 대한 저작권 및 모든 책임은 작성자 본인에게 있습니다.
2. 타인의 저작권을 침해하는 게시물로 인한 법적 책임은 게시자가 부담합니다.
3. 서비스는 약관 위반 게시물을 사전 통보 없이 삭제하거나 숨김 처리할 수 있습니다.

제5조 (서비스 제공자의 면책)
1. 이용자 간의 분쟁은 당사자 간에 해결해야 하며, 서비스 제공자는 이에 개입하지 않습니다.
2. 서비스는 이용자가 게시한 정보의 정확성을 보증하지 않습니다.
3. 천재지변, 시스템 장애 등 불가항력으로 인한 서비스 중단에 대해 책임지지 않습니다.

제6조 (계정 정지)
다음의 경우 계정이 일시 정지되거나 영구 정지될 수 있습니다:
• 신고가 누적되어 운영 정책을 위반한 것으로 판단되는 경우
• 서비스 운영을 고의로 방해하는 경우
• 불법 행위가 확인된 경우
• 허위 신고를 반복하는 경우

제7조 (서비스 변경 및 중단)
1. 서비스는 운영상 필요에 따라 서비스 내용을 변경하거나 중단할 수 있습니다.
2. 중요한 변경 사항은 서비스 내 공지를 통해 안내합니다.

제8조 (약관의 변경)
1. 본 약관은 필요 시 변경될 수 있으며, 변경 시 서비스 내 공지합니다.
2. 변경된 약관에 동의하지 않는 경우 서비스 이용을 중단하고 탈퇴할 수 있습니다.
`.trim()

const PRIVACY_CONTENT = `
제1조 (수집하는 개인정보)
서비스는 다음의 개인정보를 수집합니다:
• 필수 정보: 카카오 계정 ID, 닉네임
• 선택 정보: 이메일 주소 (건의사항 답변용)
• 자동 수집: 서비스 이용 기록, 접속 로그

제2조 (개인정보 수집 목적)
수집한 개인정보는 다음 목적으로만 사용됩니다:
• 서비스 제공 및 회원 관리
• 본인 확인 및 부정 이용 방지
• 서비스 개선 및 신규 기능 개발
• 공지사항 전달 및 문의 응대

제3조 (개인정보 보관 및 파기)
1. 개인정보는 서비스 이용 기간 동안 보관됩니다.
2. 회원 탈퇴 시 개인정보는 즉시 삭제됩니다.
3. 관련 법령에 따라 보관이 필요한 경우 해당 기간 동안 보관 후 파기합니다.
   - 전자상거래법에 따른 계약/청약철회 기록: 5년
   - 통신비밀보호법에 따른 접속 로그: 3개월

제4조 (개인정보의 제3자 제공)
서비스는 이용자의 개인정보를 제3자에게 제공하지 않습니다.
다만, 다음의 경우는 예외로 합니다:
• 이용자가 사전에 동의한 경우
• 법령에 따라 수사기관이 요청하는 경우

제5조 (이용자의 권리)
이용자는 언제든지 다음의 권리를 행사할 수 있습니다:
• 열람권: 본인의 개인정보 열람 요청
• 정정권: 잘못된 정보의 수정 요청
• 삭제권: 개인정보 삭제 요청 (회원 탈퇴)
• 처리정지권: 개인정보 처리 정지 요청

제6조 (개인정보 보호 조치)
서비스는 개인정보 보호를 위해 다음 조치를 취하고 있습니다:
• 데이터 암호화 전송 (HTTPS)
• 접근 권한 제한
• 정기적인 보안 점검

제7조 (문의처)
개인정보 관련 문의: contact@photospot.app
문의 접수 후 영업일 기준 3일 이내에 답변드립니다.

제8조 (방침의 변경)
1. 본 방침은 법령 변경 또는 서비스 정책에 따라 변경될 수 있습니다.
2. 변경 시 서비스 내 공지를 통해 안내합니다.
`.trim()

/* ── 모달 컴포넌트 ──────────────────────────────────── */

function TermsModal({
  title,
  content,
  onClose,
}: {
  title: string
  content: string
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h2 className="text-lg font-bold">{title}</h2>
          <button type="button" onClick={onClose}>
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">
            {content}
          </pre>
        </div>
        <div className="p-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 bg-blue-600 text-white rounded-xl text-sm font-semibold"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── 체크박스 컴포넌트 ──────────────────────────────── */

function CheckboxItem({
  checked,
  onChange,
  label,
  required,
  onLabelClick,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  required?: boolean
  onLabelClick?: () => void
}) {
  return (
    <div className="flex items-center gap-3 py-3">
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors ${
          checked
            ? 'bg-blue-600 border-blue-600'
            : 'bg-white border-gray-300'
        }`}
      >
        {checked && (
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>
      <button
        type="button"
        onClick={onLabelClick}
        className="flex-1 text-left text-sm text-gray-700"
      >
        {required && <span className="text-blue-600 font-semibold">[필수] </span>}
        <span className={onLabelClick ? 'underline' : ''}>{label}</span>
      </button>
    </div>
  )
}

/* ── 메인 컴포넌트 ──────────────────────────────────── */

export default function TermsAgreementPage() {
  const { user, refreshProfile } = useAuth()
  const [termsAgreed, setTermsAgreed] = useState(false)
  const [privacyAgreed, setPrivacyAgreed] = useState(false)
  const [saving, setSaving] = useState(false)
  const [modalType, setModalType] = useState<'terms' | 'privacy' | null>(null)

  const allAgreed = termsAgreed && privacyAgreed

  const handleAllAgree = (checked: boolean) => {
    setTermsAgreed(checked)
    setPrivacyAgreed(checked)
  }

  const handleSubmit = async () => {
    if (!user || !allAgreed) return

    setSaving(true)

    // upsert로 프로필이 없으면 생성, 있으면 업데이트
    const { error } = await supabase
      .from('profiles')
      .upsert(
        {
          id: user.id,
          terms_agreed_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      )

    if (error) {
      toast.error('저장에 실패했습니다: ' + error.message)
      setSaving(false)
      return
    }

    await refreshProfile()
    setSaving(false)
    // 닉네임 설정 페이지로 이동
    window.location.href = '/nickname-setup'
  }

  return (
    <div className="flex flex-col items-center justify-center h-full px-8 bg-white">
      <h1 className="text-2xl font-extrabold text-gray-900 mb-2">
        출사지도 시작하기
      </h1>
      <p className="text-sm text-gray-500 mb-8">
        서비스 이용을 위해 약관에 동의해주세요
      </p>

      <div className="w-full max-w-xs">
        {/* 개별 동의 */}
        <div className="border border-gray-200 rounded-xl px-4 mb-4">
          <CheckboxItem
            checked={termsAgreed}
            onChange={setTermsAgreed}
            label="이용약관 동의"
            required
            onLabelClick={() => setModalType('terms')}
          />
          <div className="border-t border-gray-100" />
          <CheckboxItem
            checked={privacyAgreed}
            onChange={setPrivacyAgreed}
            label="개인정보처리방침 동의"
            required
            onLabelClick={() => setModalType('privacy')}
          />
        </div>

        {/* 전체 동의 */}
        <div className="border border-gray-200 rounded-xl px-4 mb-6 bg-gray-50">
          <CheckboxItem
            checked={allAgreed}
            onChange={handleAllAgree}
            label="전체 동의"
          />
        </div>

        {/* 시작 버튼 */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!allAgreed || saving}
          className={`w-full py-3 rounded-xl text-sm font-semibold transition-colors ${
            allAgreed
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-400'
          }`}
        >
          {saving ? '처리 중...' : '시작하기'}
        </button>
      </div>

      {/* 모달 */}
      {modalType === 'terms' && (
        <TermsModal
          title="이용약관"
          content={TERMS_CONTENT}
          onClose={() => setModalType(null)}
        />
      )}
      {modalType === 'privacy' && (
        <TermsModal
          title="개인정보처리방침"
          content={PRIVACY_CONTENT}
          onClose={() => setModalType(null)}
        />
      )}
    </div>
  )
}
