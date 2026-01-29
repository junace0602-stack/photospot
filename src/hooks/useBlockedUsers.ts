import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

let globalBlockedIds: Set<string> = new Set()
let listeners: (() => void)[] = []

function notify() {
  listeners.forEach((fn) => fn())
}

export function useBlockedUsers() {
  const { user } = useAuth()
  const [blockedIds, setBlockedIds] = useState<Set<string>>(globalBlockedIds)

  useEffect(() => {
    if (!user) {
      globalBlockedIds = new Set()
      setBlockedIds(globalBlockedIds)
      return
    }

    supabase
      .from('blocked_users')
      .select('blocked_id')
      .eq('blocker_id', user.id)
      .then(({ data }) => {
        globalBlockedIds = new Set((data ?? []).map((d) => d.blocked_id))
        setBlockedIds(globalBlockedIds)
      })
  }, [user])

  useEffect(() => {
    const listener = () => setBlockedIds(new Set(globalBlockedIds))
    listeners.push(listener)
    return () => { listeners = listeners.filter((l) => l !== listener) }
  }, [])

  const blockUser = useCallback(async (targetUserId: string) => {
    if (!user) return
    const { error } = await supabase.from('blocked_users').insert({
      blocker_id: user.id,
      blocked_id: targetUserId,
    })
    if (error && !error.message.includes('duplicate')) {
      toast.error('차단에 실패했습니다.')
      return
    }
    globalBlockedIds = new Set([...globalBlockedIds, targetUserId])
    notify()
    toast.success('차단되었습니다.')
  }, [user])

  const unblockUser = useCallback(async (targetUserId: string) => {
    if (!user) return
    await supabase
      .from('blocked_users')
      .delete()
      .eq('blocker_id', user.id)
      .eq('blocked_id', targetUserId)
    const next = new Set(globalBlockedIds)
    next.delete(targetUserId)
    globalBlockedIds = next
    notify()
  }, [user])

  const isBlocked = useCallback((userId: string) => blockedIds.has(userId), [blockedIds])

  return { blockedIds, blockUser, unblockUser, isBlocked }
}
