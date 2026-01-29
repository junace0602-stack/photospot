import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  useCallback,
  type ReactNode,
} from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

export type Role = 'superadmin' | 'admin' | 'user'

export interface Profile {
  id: string
  nickname: string
  role: Role
  terms_agreed_at: string | null
}

interface AuthState {
  loggedIn: boolean
  loading: boolean
  user: User | null
  profile: Profile | null
  role: Role
  /** 관리자 계정이면서 관리자 모드가 켜져 있을 때 true */
  isAdminMode: boolean
  /** 관리자 모드 ON/OFF 전환 */
  toggleAdminMode: () => void
  /** 프로필 다시 불러오기 (닉네임 변경 등) */
  refreshProfile: () => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthState>({
  loggedIn: false,
  loading: true,
  user: null,
  profile: null,
  role: 'user',
  isAdminMode: false,
  toggleAdminMode: () => {},
  refreshProfile: async () => {},
  logout: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [adminModeOn, setAdminModeOn] = useState(
    () => sessionStorage.getItem('admin-mode-on') === 'true',
  )

  // 중복 호출 방지를 위한 ref
  const initializedRef = useRef(false)
  const lastUserIdRef = useRef<string | null>(null)

  const realRole: Role = profile?.role ?? 'user'
  const realIsAdmin = realRole === 'admin' || realRole === 'superadmin'
  const isAdminMode = realIsAdmin && adminModeOn

  const toggleAdminMode = useCallback(() => {
    setAdminModeOn((prev) => {
      const next = !prev
      if (next) sessionStorage.setItem('admin-mode-on', 'true')
      else sessionStorage.removeItem('admin-mode-on')
      return next
    })
  }, [])

  const fetchProfile = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('id, nickname, role, terms_agreed_at')
      .eq('id', userId)
      .single()
    setProfile(data as Profile | null)
  }, [])

  // 마지막 활동 시간 업데이트 (중복 호출 방지)
  const updateLastActive = useCallback(async (userId: string) => {
    await supabase
      .from('profiles')
      .update({ last_active_at: new Date().toISOString() })
      .eq('id', userId)
  }, [])

  useEffect(() => {
    // getSession으로 초기 세션 확인
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null
      setUser(u)

      if (u) {
        // 동일 사용자 중복 호출 방지
        if (lastUserIdRef.current !== u.id) {
          lastUserIdRef.current = u.id
          fetchProfile(u.id).finally(() => setLoading(false))
          updateLastActive(u.id)
        } else {
          setLoading(false)
        }
      } else {
        setLoading(false)
      }
      initializedRef.current = true
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      // 초기화 전이면 무시 (getSession에서 처리)
      if (!initializedRef.current) return

      const u = session?.user ?? null
      setUser(u)

      if (u) {
        // 동일 사용자 중복 호출 방지
        if (lastUserIdRef.current !== u.id) {
          lastUserIdRef.current = u.id
          fetchProfile(u.id).finally(() => setLoading(false))
          updateLastActive(u.id)
        }
      } else {
        lastUserIdRef.current = null
        setProfile(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [fetchProfile, updateLastActive])

  // 주기적으로 활동 시간 업데이트 (10분마다로 변경 - 불필요한 DB 호출 감소)
  useEffect(() => {
    if (!user) return

    const interval = setInterval(() => {
      updateLastActive(user.id)
    }, 10 * 60 * 1000) // 10분

    return () => clearInterval(interval)
  }, [user, updateLastActive])

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id)
  }

  const logout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
  }

  return (
    <AuthContext.Provider
      value={{
        loggedIn: !!user,
        loading,
        user,
        profile,
        role: realRole,
        isAdminMode,
        toggleAdminMode,
        refreshProfile,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
