import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export default function GuidePage() {
  const navigate = useNavigate()

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <header className="shrink-0 flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-200">
        <button type="button" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-6 h-6 text-gray-700" />
        </button>
        <h1 className="text-lg font-bold">이용 가이드</h1>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-4">
          {/* 지도 */}
          <section className="bg-white rounded-xl p-4 shadow-sm">
            <h2 className="text-base font-bold text-gray-900 mb-3">📍 지도</h2>
            <ul className="space-y-2 text-sm text-gray-600 leading-relaxed">
              <li>지도에서 출사지 위치를 한눈에 확인할 수 있습니다.</li>
              <li>핀을 클릭하면 해당 출사지의 상세 정보를 볼 수 있습니다.</li>
              <li>상단에서 국내/해외 탭을 전환할 수 있습니다.</li>
              <li>하단 목록을 위로 드래그하면 출사지 목록을 볼 수 있습니다.</li>
              <li>지도 하단의 글쓰기 버튼으로 새로운 출사지를 등록할 수 있습니다.</li>
            </ul>
          </section>

          {/* 피드 */}
          <section className="bg-white rounded-xl p-4 shadow-sm">
            <h2 className="text-base font-bold text-gray-900 mb-3">📸 피드</h2>
            <ul className="space-y-2 text-sm text-gray-600 leading-relaxed">
              <li><strong>전체</strong>: 모든 게시글을 최신순으로 볼 수 있습니다.</li>
              <li><strong>일반</strong>: 자유로운 주제의 글을 작성하고 읽을 수 있습니다.</li>
              <li><strong>사진</strong>: 촬영한 사진을 공유하는 공간입니다.</li>
              <li><strong>장비</strong>: 카메라, 렌즈 등 장비 관련 이야기를 나눕니다.</li>
              <li><strong>챌린지</strong>: 주제별 사진 챌린지에 참여할 수 있습니다.</li>
              <li><strong>공지</strong>: 서비스 관련 공지사항을 확인할 수 있습니다.</li>
            </ul>
          </section>

          {/* 챌린지 */}
          <section className="bg-white rounded-xl p-4 shadow-sm">
            <h2 className="text-base font-bold text-gray-900 mb-3">🏆 챌린지</h2>
            <ul className="space-y-2 text-sm text-gray-600 leading-relaxed">
              <li>챌린지 게시글에 댓글로 사진을 첨부하여 참여합니다.</li>
              <li>챌린지 종료 시 추천 수가 가장 많은 댓글이 우승합니다.</li>
              <li>우승자는 다음 챌린지를 직접 생성할 수 있는 권한을 얻습니다.</li>
              <li>48시간 내에 챌린지를 생성하지 않으면 2위에게 권한이 넘어갑니다.</li>
            </ul>
          </section>

          {/* 프로필 */}
          <section className="bg-white rounded-xl p-4 shadow-sm">
            <h2 className="text-base font-bold text-gray-900 mb-3">👤 프로필</h2>
            <ul className="space-y-2 text-sm text-gray-600 leading-relaxed">
              <li>닉네임은 30일에 한 번만 변경할 수 있습니다.</li>
              <li>마이페이지에서 작성글 공개/비공개 설정을 변경할 수 있습니다.</li>
              <li>다른 사용자의 닉네임을 클릭하면 그 사람이 작성한 글 목록을 볼 수 있습니다.</li>
            </ul>
          </section>

          {/* 기타 */}
          <section className="bg-white rounded-xl p-4 shadow-sm">
            <h2 className="text-base font-bold text-gray-900 mb-3">💡 기타</h2>
            <ul className="space-y-2 text-sm text-gray-600 leading-relaxed">
              <li><strong>건의하기</strong>: 버그 신고, 기능 제안, 문의사항을 보낼 수 있습니다.</li>
              <li><strong>후원하기</strong>: 서버 유지와 기능 개선을 위한 후원을 할 수 있습니다.</li>
            </ul>
          </section>

          <p className="text-center text-xs text-gray-400 py-2">
            더 궁금한 점은 건의하기를 통해 문의해 주세요.
          </p>
        </div>
      </div>
    </div>
  )
}
