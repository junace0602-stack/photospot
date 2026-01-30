import { useNavigate } from 'react-router-dom'
import { ArrowLeft, CheckCircle, XCircle, AlertTriangle } from 'lucide-react'

export default function RulesPage() {
  const navigate = useNavigate()

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <header className="shrink-0 flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-200">
        <button type="button" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-6 h-6 text-gray-700" />
        </button>
        <h1 className="text-lg font-bold">커뮤니티 가이드</h1>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-6">
          {/* 인트로 */}
          <section className="bg-white rounded-xl p-4 shadow-sm">
            <p className="text-sm text-gray-600 leading-relaxed">
              출사지도는 사진 촬영을 사랑하는 분들을 위한 커뮤니티입니다.
              모두가 즐겁게 사용할 수 있도록 아래 가이드를 지켜주세요.
            </p>
          </section>

          {/* 허용되는 콘텐츠 */}
          <section className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <h2 className="text-base font-bold text-gray-900">허용되는 콘텐츠</h2>
            </div>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5">+</span>
                <span>출사지 정보 공유 및 리뷰</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5">+</span>
                <span>촬영한 사진 공유</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5">+</span>
                <span>카메라/장비 관련 질문 및 팁</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5">+</span>
                <span>출사 동행 모집</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5">+</span>
                <span>중고 장비 거래</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5">+</span>
                <span>일반적인 대화 및 소통</span>
              </li>
            </ul>
          </section>

          {/* 금지되는 콘텐츠 */}
          <section className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <XCircle className="w-5 h-5 text-red-500" />
              <h2 className="text-base font-bold text-gray-900">금지되는 콘텐츠</h2>
            </div>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start gap-2">
                <span className="text-red-500 mt-0.5">-</span>
                <span><strong>광고/홍보</strong>: 상업적 광고, 타 사이트/앱 홍보</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500 mt-0.5">-</span>
                <span><strong>스팸/도배</strong>: 반복적인 글, 의미 없는 내용</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500 mt-0.5">-</span>
                <span><strong>정치 콘텐츠</strong>: 정치인, 정당 관련 내용</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500 mt-0.5">-</span>
                <span><strong>일베/극단적 커뮤니티 용어</strong>: 특정 사이트의 혐오 표현</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500 mt-0.5">-</span>
                <span><strong>고인 비하/모독</strong>: 고인을 조롱하거나 비하하는 표현</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500 mt-0.5">-</span>
                <span><strong>지역/인종 비하</strong>: 특정 지역이나 인종을 비하하는 표현</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500 mt-0.5">-</span>
                <span><strong>성인물/폭력</strong>: 선정적이거나 폭력적인 콘텐츠</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500 mt-0.5">-</span>
                <span><strong>사기/허위정보</strong>: 거짓 정보, 사기 시도</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500 mt-0.5">-</span>
                <span><strong>개인정보 노출</strong>: 타인의 신상 정보 공개</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500 mt-0.5">-</span>
                <span><strong>저작권 침해</strong>: 타인의 사진을 무단 도용</span>
              </li>
            </ul>
            <div className="mt-4 p-3 bg-red-50 rounded-lg border border-red-100">
              <p className="text-xs text-red-600">
                <strong>분탕 주의:</strong> 위 규칙 외에도 커뮤니티 분위기를 해치는 글은
                관리자 판단에 따라 삭제 및 제재될 수 있습니다.
              </p>
            </div>
          </section>

          {/* 제재 안내 */}
          <section className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              <h2 className="text-base font-bold text-gray-900">제재 안내</h2>
            </div>
            <p className="text-sm text-gray-600 mb-3">
              가이드 위반 시 관리자 판단에 따라 제재가 적용됩니다.
            </p>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start gap-2">
                <span className="w-16 shrink-0 font-medium text-gray-700">경고</span>
                <span>가벼운 위반 시 기록만 남김</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-16 shrink-0 font-medium text-gray-700">1~30일</span>
                <span>위반 정도에 따라 기간 정지</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-16 shrink-0 font-medium text-gray-700">영구 정지</span>
                <span>심각한 위반 또는 반복 위반</span>
              </li>
            </ul>
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500">
                * 제재 기간 동안 글쓰기와 댓글 작성이 제한됩니다.<br />
                * 정지 해제 후 재위반 시 더 강한 제재가 적용될 수 있습니다.<br />
                * 제재에 대한 문의는 설정 &gt; 건의하기를 이용해 주세요.
              </p>
            </div>
          </section>

          {/* 신고 안내 */}
          <section className="bg-white rounded-xl p-4 shadow-sm">
            <h2 className="text-base font-bold text-gray-900 mb-3">신고하기</h2>
            <p className="text-sm text-gray-600">
              가이드를 위반하는 글이나 댓글을 발견하면 우측 상단의 메뉴에서
              '신고하기'를 선택해 주세요. 관리자가 검토 후 조치합니다.
            </p>
          </section>

          <p className="text-center text-xs text-gray-400 py-4">
            함께 건강한 커뮤니티를 만들어 주셔서 감사합니다.
          </p>
        </div>
      </div>
    </div>
  )
}
