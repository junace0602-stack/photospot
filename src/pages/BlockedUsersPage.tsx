import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useBlockedUsers } from '../hooks/useBlockedUsers'

interface BlockedEntry {
  blocked_id: string
  nickname: string
  created_at: string
}

export default function BlockedUsersPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { unblockUser } = useBlockedUsers()
  const [items, setItems] = useState<BlockedEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return

    const load = async () => {
      const { data } = await supabase
        .from('blocked_users')
        .select('blocked_id, created_at')
        .eq('blocker_id', user.id)
        .order('created_at', { ascending: false })

      if (!data || data.length === 0) {
        setItems([])
        setLoading(false)
        return
      }

      // 차단된 유저들의 닉네임 가져오기
      const ids = data.map((d) => d.blocked_id)
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, nickname')
        .in('id', ids)

      const nickMap = new Map<string, string>()
      for (const p of profiles ?? []) {
        nickMap.set(p.id, p.nickname)
      }

      setItems(
        data.map((d) => ({
          blocked_id: d.blocked_id,
          nickname: nickMap.get(d.blocked_id) ?? '알 수 없음',
          created_at: d.created_at,
        })),
      )
      setLoading(false)
    }

    load()
  }, [user])

  const handleUnblock = async (blockedId: string) => {
    await unblockUser(blockedId)
    setItems((p) => p.filter((i) => i.blocked_id !== blockedId))
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <header className="shrink-0 flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-200">
        <button type="button" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-6 h-6 text-gray-700" />
        </button>
        <h1 className="text-lg font-bold">차단 목록</h1>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {loading ? (
          <p className="text-center text-sm text-gray-400 py-10">불러오는 중...</p>
        ) : items.length === 0 ? (
          <p className="text-center text-sm text-gray-400 py-10">차단한 유저가 없습니다.</p>
        ) : (
          items.map((item) => (
            <div
              key={item.blocked_id}
              className="flex items-center gap-3 bg-white rounded-xl px-4 py-3 shadow-sm"
            >
              <div className="w-9 h-9 rounded-full bg-gray-200 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800">{item.nickname}</p>
                <p className="text-xs text-gray-400">
                  {new Date(item.created_at).toLocaleDateString('ko-KR')} 차단
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleUnblock(item.blocked_id)}
                className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 text-xs font-medium"
              >
                차단 해제
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
