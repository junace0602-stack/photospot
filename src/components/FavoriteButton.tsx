import { Star } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../contexts/AuthContext'

interface Props {
  placeId: string
  favorited: boolean
  onToggle: (placeId: string) => void
  size?: 'sm' | 'md'
}

export default function FavoriteButton({ placeId, favorited, onToggle, size = 'sm' }: Props) {
  const { loggedIn } = useAuth()

  const iconClass = size === 'sm' ? 'w-3.5 h-3.5' : 'w-5 h-5'

  return (
    <span
      role="button"
      tabIndex={0}
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        if (!loggedIn) {
          toast('로그인이 필요합니다.')
          return
        }
        onToggle(placeId)
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          e.stopPropagation()
          if (!loggedIn) {
            toast('로그인이 필요합니다.')
            return
          }
          onToggle(placeId)
        }
      }}
      className="shrink-0 p-1 cursor-pointer inline-flex"
    >
      <Star
        className={`${iconClass} ${
          favorited
            ? 'fill-yellow-400 text-yellow-400'
            : 'fill-none text-gray-300'
        }`}
      />
    </span>
  )
}
