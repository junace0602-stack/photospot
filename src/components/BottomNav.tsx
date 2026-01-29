import { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { Map, Newspaper, User } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

const tabs = [
  { to: '/', label: '지도', icon: Map },
  { to: '/list', label: '피드', icon: Newspaper },
  { to: '/mypage', label: '마이페이지', icon: User },
]

export default function BottomNav() {
  const { user } = useAuth()
  const [hasUnread, setHasUnread] = useState(false)

  useEffect(() => {
    if (!user) { setHasUnread(false); return }
    supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false)
      .then(({ count }) => setHasUnread((count ?? 0) > 0))
  }, [user])

  return (
    <nav className="shrink-0 bg-white border-t border-gray-200">
      <ul className="flex justify-around">
        {tabs.map(({ to, label, icon: Icon }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `relative flex flex-col items-center py-2 text-xs ${
                  isActive ? 'text-blue-600' : 'text-gray-500'
                }`
              }
            >
              <Icon className="w-6 h-6 mb-0.5" />
              {label}
              {to === '/mypage' && hasUnread && (
                <span className="absolute top-1.5 right-1/2 translate-x-4 w-2 h-2 bg-red-500 rounded-full" />
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
