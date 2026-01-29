import { useNavigate } from 'react-router-dom'
import { MessageCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'

export default function LoginPage() {
  const navigate = useNavigate()

  const handleKakaoLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'kakao',
      options: {
        redirectTo: `${window.location.origin}/`,
        scopes: 'profile_nickname',
      },
    })
    if (error) toast.error('로그인에 실패했습니다: ' + error.message)
  }

  return (
    <div className="flex flex-col items-center justify-center h-full px-8 bg-white">
      {/* Logo */}
      <div className="mb-3">
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
          출사지도
        </h1>
      </div>
      <p className="text-sm text-gray-500 mb-16">
        사진 찍기 좋은 장소를 찾아보세요
      </p>

      {/* Kakao login */}
      <button
        type="button"
        onClick={handleKakaoLogin}
        className="w-full max-w-xs flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold"
        style={{ backgroundColor: '#FEE500', color: '#191919' }}
      >
        <MessageCircle className="w-5 h-5" />
        카카오 로그인
      </button>

      {/* Browse without login */}
      <button
        type="button"
        onClick={() => navigate('/')}
        className="mt-6 text-sm text-gray-400 underline underline-offset-2"
      >
        로그인 없이 둘러보기
      </button>
    </div>
  )
}
