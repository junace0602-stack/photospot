import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export default function NicknameSetupPage() {
  const { user } = useAuth()
  const [nickname, setNickname] = useState('')
  const [checking, setChecking] = useState(false)
  const [available, setAvailable] = useState<boolean | null>(null)
  const [saving, setSaving] = useState(false)

  // 실시간 중복 체크 (500ms debounce)
  useEffect(() => {
    const trimmed = nickname.trim()
    if (trimmed.length < 2) {
      setAvailable(null)
      return
    }

    setChecking(true)
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id')
        .eq('nickname', trimmed)
        .neq('id', user?.id ?? '')
        .maybeSingle()
      setAvailable(!data)
      setChecking(false)
    }, 500)

    return () => {
      clearTimeout(timer)
      setChecking(false)
    }
  }, [nickname, user?.id])

  const handleSave = async () => {
    if (!user || !nickname.trim() || available !== true) return
    setSaving(true)
    const { error } = await supabase.from('profiles').upsert({
      id: user.id,
      nickname: nickname.trim(),
      role: 'user',
    })
    setSaving(false)
    if (error) {
      if (error.code === '23505') {
        setAvailable(false)
        return
      }
      toast.error('저장에 실패했습니다: ' + error.message)
      return
    }
    window.location.href = '/'
  }

  return (
    <div className="flex flex-col items-center justify-center h-full px-8 bg-white">
      <h1 className="text-2xl font-extrabold text-gray-900 mb-2">
        닉네임 설정
      </h1>
      <p className="text-sm text-gray-500 mb-8">
        출사지도에서 사용할 닉네임을 입력해주세요
      </p>

      <div className="w-full max-w-xs space-y-3">
        <input
          type="text"
          placeholder="닉네임 입력 (2~12자)"
          maxLength={12}
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          className="w-full px-4 py-3 bg-gray-100 rounded-xl text-sm outline-none"
        />

        {checking && (
          <p className="text-sm text-gray-400">중복 확인 중...</p>
        )}
        {!checking && available === true && (
          <p className="text-sm text-green-600">사용 가능한 닉네임입니다.</p>
        )}
        {!checking && available === false && (
          <p className="text-sm text-red-500">이미 사용 중인 닉네임입니다.</p>
        )}

        <button
          type="button"
          onClick={handleSave}
          disabled={available !== true || saving}
          className={`w-full py-3 rounded-xl text-sm font-semibold ${
            available === true
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-400'
          }`}
        >
          {saving ? '저장 중...' : '시작하기'}
        </button>
      </div>
    </div>
  )
}
