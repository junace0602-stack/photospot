import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export default function PrivacyPage() {
  const navigate = useNavigate()

  return (
    <div className="flex flex-col h-full bg-white">
      <header className="shrink-0 flex items-center gap-3 px-4 py-3 border-b border-gray-200">
        <button type="button" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-6 h-6 text-gray-700" />
        </button>
        <h1 className="text-lg font-bold">개인정보처리방침</h1>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-6">
        <p className="text-xs text-gray-400 mb-6">최종 업데이트: 2025년 1월 29일</p>

        <p className="text-sm text-gray-700 leading-relaxed mb-8">
          "출사지도"(이하 "서비스")는 이용자의 개인정보를 중요하게 생각하며,
          개인정보보호법 등 관련 법령을 준수합니다.
        </p>

        <section className="mb-8">
          <h2 className="text-base font-bold text-gray-900 mb-3">제1조 (수집하는 개인정보)</h2>
          <div className="text-sm text-gray-700 leading-relaxed space-y-2">
            <p>서비스는 다음의 개인정보를 수집합니다:</p>
            <ul className="list-disc list-inside ml-2 space-y-1">
              <li><strong>필수 정보:</strong> 카카오 계정 ID, 닉네임</li>
              <li><strong>선택 정보:</strong> 이메일 주소 (건의사항 답변용)</li>
              <li><strong>자동 수집:</strong> 서비스 이용 기록, 접속 로그</li>
            </ul>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-base font-bold text-gray-900 mb-3">제2조 (개인정보 수집 목적)</h2>
          <div className="text-sm text-gray-700 leading-relaxed space-y-2">
            <p>수집한 개인정보는 다음 목적으로만 사용됩니다:</p>
            <ul className="list-disc list-inside ml-2 space-y-1">
              <li>서비스 제공 및 회원 관리</li>
              <li>본인 확인 및 부정 이용 방지</li>
              <li>서비스 개선 및 신규 기능 개발</li>
              <li>공지사항 전달 및 문의 응대</li>
            </ul>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-base font-bold text-gray-900 mb-3">제3조 (개인정보 보관 및 파기)</h2>
          <div className="text-sm text-gray-700 leading-relaxed space-y-2">
            <p>1. 개인정보는 서비스 이용 기간 동안 보관됩니다.</p>
            <p>2. 회원 탈퇴 시 개인정보는 <strong>즉시 삭제</strong>됩니다.</p>
            <p>3. 관련 법령에 따라 보관이 필요한 경우 해당 기간 동안 보관 후 파기합니다.</p>
            <ul className="list-disc list-inside ml-4 mt-2 space-y-1 text-gray-500">
              <li>전자상거래법에 따른 계약/청약철회 기록: 5년</li>
              <li>통신비밀보호법에 따른 접속 로그: 3개월</li>
            </ul>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-base font-bold text-gray-900 mb-3">제4조 (개인정보의 제3자 제공)</h2>
          <div className="text-sm text-gray-700 leading-relaxed space-y-2">
            <p>서비스는 이용자의 개인정보를 <strong>제3자에게 제공하지 않습니다.</strong></p>
            <p className="mt-2">다만, 다음의 경우는 예외로 합니다:</p>
            <ul className="list-disc list-inside ml-2 space-y-1">
              <li>이용자가 사전에 동의한 경우</li>
              <li>법령에 따라 수사기관이 요청하는 경우</li>
            </ul>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-base font-bold text-gray-900 mb-3">제5조 (이용자의 권리)</h2>
          <div className="text-sm text-gray-700 leading-relaxed space-y-2">
            <p>이용자는 언제든지 다음의 권리를 행사할 수 있습니다:</p>
            <ul className="list-disc list-inside ml-2 space-y-1">
              <li><strong>열람권:</strong> 본인의 개인정보 열람 요청</li>
              <li><strong>정정권:</strong> 잘못된 정보의 수정 요청</li>
              <li><strong>삭제권:</strong> 개인정보 삭제 요청 (회원 탈퇴)</li>
              <li><strong>처리정지권:</strong> 개인정보 처리 정지 요청</li>
            </ul>
            <p className="mt-2">권리 행사는 서비스 내 설정 또는 아래 연락처를 통해 가능합니다.</p>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-base font-bold text-gray-900 mb-3">제6조 (개인정보 보호 조치)</h2>
          <div className="text-sm text-gray-700 leading-relaxed space-y-2">
            <p>서비스는 개인정보 보호를 위해 다음 조치를 취하고 있습니다:</p>
            <ul className="list-disc list-inside ml-2 space-y-1">
              <li>데이터 암호화 전송 (HTTPS)</li>
              <li>접근 권한 제한</li>
              <li>정기적인 보안 점검</li>
            </ul>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-base font-bold text-gray-900 mb-3">제7조 (문의처)</h2>
          <div className="text-sm text-gray-700 leading-relaxed space-y-2">
            <p>개인정보 관련 문의는 아래로 연락해 주세요:</p>
            <div className="mt-2 p-3 bg-gray-50 rounded-lg">
              <p><strong>이메일:</strong> contact@photospot.app</p>
            </div>
            <p className="mt-2 text-gray-500">
              문의 접수 후 영업일 기준 3일 이내에 답변드립니다.
            </p>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-base font-bold text-gray-900 mb-3">제8조 (방침의 변경)</h2>
          <div className="text-sm text-gray-700 leading-relaxed space-y-2">
            <p>1. 본 방침은 법령 변경 또는 서비스 정책에 따라 변경될 수 있습니다.</p>
            <p>2. 변경 시 서비스 내 공지를 통해 안내합니다.</p>
          </div>
        </section>

        <div className="text-xs text-gray-400 mt-8 pb-8">
          본 방침은 2025년 1월 29일부터 시행됩니다.
        </div>
      </div>
    </div>
  )
}
