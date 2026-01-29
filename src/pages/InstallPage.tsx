import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Smartphone, Share, MoreVertical, Plus, Download, Check, ChevronRight } from 'lucide-react'

type DeviceType = 'select' | 'ios' | 'android'

export default function InstallPage() {
  const navigate = useNavigate()
  const [device, setDevice] = useState<DeviceType>('select')

  const iosSteps = [
    {
      icon: <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center"><span className="text-2xl">🧭</span></div>,
      title: 'Safari로 접속',
      description: '반드시 Safari 브라우저로 이 페이지에 접속하세요',
    },
    {
      icon: <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center"><Share className="w-5 h-5 text-white" /></div>,
      title: '공유 버튼 탭',
      description: '화면 하단의 공유 버튼(⬆️)을 탭하세요',
    },
    {
      icon: <div className="w-10 h-10 bg-gray-800 rounded-xl flex items-center justify-center"><Plus className="w-5 h-5 text-white" /></div>,
      title: '"홈 화면에 추가" 선택',
      description: '스크롤해서 "홈 화면에 추가"를 찾아 탭하세요',
    },
    {
      icon: <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center"><Check className="w-5 h-5 text-white" /></div>,
      title: '"추가" 탭',
      description: '우측 상단의 "추가" 버튼을 탭하면 완료!',
    },
  ]

  const androidSteps = [
    {
      icon: <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center"><span className="text-2xl">🌐</span></div>,
      title: 'Chrome으로 접속',
      description: 'Chrome 브라우저로 이 페이지에 접속하세요',
    },
    {
      icon: <div className="w-10 h-10 bg-gray-700 rounded-xl flex items-center justify-center"><MoreVertical className="w-5 h-5 text-white" /></div>,
      title: '메뉴 버튼 탭',
      description: '우측 상단의 ⋮ 메뉴 버튼을 탭하세요',
    },
    {
      icon: <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center"><Download className="w-5 h-5 text-white" /></div>,
      title: '"앱 설치" 또는 "홈 화면에 추가" 선택',
      description: '메뉴에서 해당 항목을 찾아 탭하세요',
    },
    {
      icon: <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center"><Check className="w-5 h-5 text-white" /></div>,
      title: '"설치" 탭',
      description: '설치 버튼을 탭하면 완료!',
    },
  ]

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* 헤더 */}
      <header className="shrink-0 flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-200">
        <button type="button" onClick={() => device === 'select' ? navigate(-1) : setDevice('select')}>
          <ArrowLeft className="w-6 h-6 text-gray-700" />
        </button>
        <h1 className="text-lg font-bold">앱 설치하기</h1>
      </header>

      {/* 본문 */}
      <div className="flex-1 overflow-y-auto">
        {device === 'select' ? (
          /* 기기 선택 화면 */
          <div className="p-6">
            {/* 앱 아이콘 */}
            <div className="flex flex-col items-center mb-8 pt-6">
              <div className="w-24 h-24 bg-blue-500 rounded-3xl shadow-lg flex items-center justify-center mb-4">
                <svg viewBox="0 0 512 512" className="w-16 h-16">
                  <path d="M256 80c-66.3 0-120 53.7-120 120 0 90 120 200 120 200s120-110 120-200c0-66.3-53.7-120-120-120z" fill="white"/>
                  <rect x="206" y="150" width="100" height="70" rx="8" fill="#3B82F6"/>
                  <circle cx="256" cy="185" r="22" fill="white"/>
                  <circle cx="256" cy="185" r="14" fill="#3B82F6"/>
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900">출사지도</h2>
              <p className="text-sm text-gray-500 mt-1">홈 화면에 추가하여 앱처럼 사용하세요</p>
            </div>

            {/* 기기 선택 버튼 */}
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setDevice('ios')}
                className="w-full flex items-center gap-4 p-4 bg-white rounded-2xl shadow-sm border border-gray-100"
              >
                <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                  <Smartphone className="w-6 h-6 text-gray-700" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-semibold text-gray-900">아이폰 (iOS)</p>
                  <p className="text-sm text-gray-500">Safari 브라우저 필요</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </button>

              <button
                type="button"
                onClick={() => setDevice('android')}
                className="w-full flex items-center gap-4 p-4 bg-white rounded-2xl shadow-sm border border-gray-100"
              >
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <Smartphone className="w-6 h-6 text-green-600" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-semibold text-gray-900">갤럭시 / 안드로이드</p>
                  <p className="text-sm text-gray-500">Chrome 브라우저 권장</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* 안내 문구 */}
            <div className="mt-8 p-4 bg-blue-50 rounded-xl">
              <p className="text-sm text-blue-800">
                <strong>왜 앱 설치인가요?</strong><br />
                홈 화면에 추가하면 앱처럼 전체 화면으로 사용할 수 있고, 더 빠르게 접속할 수 있습니다.
              </p>
            </div>
          </div>
        ) : (
          /* 설치 가이드 */
          <div className="p-6">
            {/* 기기 타입 표시 */}
            <div className="flex items-center gap-3 mb-6">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                device === 'ios' ? 'bg-gray-100' : 'bg-green-100'
              }`}>
                <Smartphone className={`w-6 h-6 ${device === 'ios' ? 'text-gray-700' : 'text-green-600'}`} />
              </div>
              <div>
                <p className="font-semibold text-gray-900">
                  {device === 'ios' ? '아이폰 (iOS)' : '안드로이드'}
                </p>
                <p className="text-sm text-gray-500">
                  {device === 'ios' ? 'Safari 브라우저에서 진행하세요' : 'Chrome 브라우저에서 진행하세요'}
                </p>
              </div>
            </div>

            {/* 단계별 안내 */}
            <div className="space-y-4">
              {(device === 'ios' ? iosSteps : androidSteps).map((step, index) => (
                <div key={index} className="flex gap-4 p-4 bg-white rounded-xl shadow-sm border border-gray-100">
                  <div className="shrink-0">
                    <div className="relative">
                      {step.icon}
                      <div className="absolute -top-1 -left-1 w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                        <span className="text-xs text-white font-bold">{index + 1}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{step.title}</p>
                    <p className="text-sm text-gray-500 mt-0.5">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* 완료 안내 */}
            <div className="mt-6 p-4 bg-green-50 rounded-xl">
              <p className="text-sm text-green-800 flex items-start gap-2">
                <Check className="w-5 h-5 shrink-0 mt-0.5" />
                <span>
                  설치가 완료되면 홈 화면에서 <strong>출사지도</strong> 앱 아이콘을 찾을 수 있습니다!
                </span>
              </p>
            </div>

            {/* 다른 기기 선택 */}
            <button
              type="button"
              onClick={() => setDevice('select')}
              className="w-full mt-4 py-3 text-sm text-blue-600 font-medium"
            >
              다른 기기로 설치하기
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
