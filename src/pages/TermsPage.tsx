import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export default function TermsPage() {
  const navigate = useNavigate()

  return (
    <div className="flex flex-col h-full bg-white">
      <header className="shrink-0 flex items-center gap-3 px-4 py-3 border-b border-gray-200">
        <button type="button" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-6 h-6 text-gray-700" />
        </button>
        <h1 className="text-lg font-bold">이용약관</h1>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-6">
        <p className="text-xs text-gray-400 mb-6">최종 업데이트: 2025년 1월 29일</p>

        <section className="mb-8">
          <h2 className="text-base font-bold text-gray-900 mb-3">제1조 (서비스 소개)</h2>
          <p className="text-sm text-gray-700 leading-relaxed">
            "출사지도"(이하 "서비스")는 사진 촬영 장소를 공유하고 소통하는 커뮤니티 플랫폼입니다.
            이용자는 출사지 정보, 사진, 촬영 팁 등을 공유하고 다른 이용자와 교류할 수 있습니다.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-base font-bold text-gray-900 mb-3">제2조 (회원가입 및 탈퇴)</h2>
          <div className="text-sm text-gray-700 leading-relaxed space-y-2">
            <p>1. 회원가입은 카카오 계정을 통해 진행되며, 닉네임 설정 후 서비스 이용이 가능합니다.</p>
            <p>2. 회원은 언제든지 서비스 내에서 탈퇴를 요청할 수 있습니다.</p>
            <p>3. 탈퇴 시 회원 정보는 즉시 삭제되며, 작성한 게시물은 별도 요청 시 삭제됩니다.</p>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-base font-bold text-gray-900 mb-3">제3조 (이용자의 의무)</h2>
          <div className="text-sm text-gray-700 leading-relaxed space-y-2">
            <p>이용자는 다음 행위를 해서는 안 됩니다:</p>
            <ul className="list-disc list-inside ml-2 space-y-1">
              <li>불법 촬영물, 음란물 등 불법 콘텐츠 게시</li>
              <li>타인을 비방하거나 명예를 훼손하는 행위</li>
              <li>허위 정보 유포 또는 사기 행위</li>
              <li>서비스 운영을 방해하는 행위</li>
              <li>타인의 개인정보를 무단으로 수집하거나 유포하는 행위</li>
              <li>영리 목적의 광고, 스팸 게시</li>
            </ul>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-base font-bold text-gray-900 mb-3">제4조 (게시물의 권리 및 책임)</h2>
          <div className="text-sm text-gray-700 leading-relaxed space-y-2">
            <p>1. 게시물에 대한 저작권 및 모든 책임은 작성자 본인에게 있습니다.</p>
            <p>2. 타인의 저작권을 침해하는 게시물로 인한 법적 책임은 게시자가 부담합니다.</p>
            <p>3. 서비스는 약관 위반 게시물을 사전 통보 없이 삭제하거나 숨김 처리할 수 있습니다.</p>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-base font-bold text-gray-900 mb-3">제5조 (서비스 제공자의 면책)</h2>
          <div className="text-sm text-gray-700 leading-relaxed space-y-2">
            <p>1. 이용자 간의 분쟁은 당사자 간에 해결해야 하며, 서비스 제공자는 이에 개입하지 않습니다.</p>
            <p>2. 서비스는 이용자가 게시한 정보의 정확성을 보증하지 않습니다.</p>
            <p>3. 천재지변, 시스템 장애 등 불가항력으로 인한 서비스 중단에 대해 책임지지 않습니다.</p>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-base font-bold text-gray-900 mb-3">제6조 (계정 정지)</h2>
          <div className="text-sm text-gray-700 leading-relaxed space-y-2">
            <p>다음의 경우 계정이 일시 정지되거나 영구 정지될 수 있습니다:</p>
            <ul className="list-disc list-inside ml-2 space-y-1">
              <li>신고가 누적되어 운영 정책을 위반한 것으로 판단되는 경우</li>
              <li>서비스 운영을 고의로 방해하는 경우</li>
              <li>불법 행위가 확인된 경우</li>
              <li>허위 신고를 반복하는 경우</li>
            </ul>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-base font-bold text-gray-900 mb-3">제7조 (서비스 변경 및 중단)</h2>
          <div className="text-sm text-gray-700 leading-relaxed space-y-2">
            <p>1. 서비스는 운영상 필요에 따라 서비스 내용을 변경하거나 중단할 수 있습니다.</p>
            <p>2. 중요한 변경 사항은 서비스 내 공지를 통해 안내합니다.</p>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-base font-bold text-gray-900 mb-3">제8조 (약관의 변경)</h2>
          <div className="text-sm text-gray-700 leading-relaxed space-y-2">
            <p>1. 본 약관은 필요 시 변경될 수 있으며, 변경 시 서비스 내 공지합니다.</p>
            <p>2. 변경된 약관에 동의하지 않는 경우 서비스 이용을 중단하고 탈퇴할 수 있습니다.</p>
          </div>
        </section>

        <div className="text-xs text-gray-400 mt-8 pb-8">
          본 약관은 2025년 1월 29일부터 시행됩니다.
        </div>
      </div>
    </div>
  )
}
