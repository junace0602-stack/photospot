import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export function useFavorites() {
  const { user } = useAuth()
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!user) {
      setFavoriteIds(new Set())
      return
    }

    supabase
      .from('favorites')
      .select('place_id')
      .eq('user_id', user.id)
      .then(({ data }) => {
        setFavoriteIds(new Set((data ?? []).map((d) => d.place_id)))
      })
  }, [user])

  const isFavorited = useCallback(
    (placeId: string) => favoriteIds.has(placeId),
    [favoriteIds],
  )

  const toggleFavorite = useCallback(
    async (placeId: string) => {
      if (!user) return

      const was = favoriteIds.has(placeId)

      // optimistic update
      setFavoriteIds((prev) => {
        const next = new Set(prev)
        if (was) next.delete(placeId)
        else next.add(placeId)
        return next
      })

      if (was) {
        const { error } = await supabase
          .from('favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('place_id', placeId)
        if (error) {
          // rollback
          setFavoriteIds((prev) => new Set(prev).add(placeId))
        }
      } else {
        const { error } = await supabase
          .from('favorites')
          .insert({ user_id: user.id, place_id: placeId })
        if (error) {
          // rollback
          setFavoriteIds((prev) => {
            const next = new Set(prev)
            next.delete(placeId)
            return next
          })
        }
      }
    },
    [user, favoriteIds],
  )

  return { isFavorited, toggleFavorite }
}
