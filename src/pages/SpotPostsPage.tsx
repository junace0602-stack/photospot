import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Plus, ThumbsUp } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { Place, Post } from '../lib/types'
import { useAuth } from '../contexts/AuthContext'

export default function SpotPostsPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { loggedIn } = useAuth()

  const [place, setPlace] = useState<Place | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return

    const load = async () => {
      const [placeRes, postsRes] = await Promise.all([
        supabase.from('places').select('*').eq('id', id).single(),
        supabase
          .from('posts')
          .select('*')
          .eq('place_id', id)
          .order('created_at', { ascending: false }),
      ])

      if (placeRes.data) setPlace(placeRes.data as Place)
      if (postsRes.data) setPosts(postsRes.data as Post[])
      setLoading(false)
    }

    load()
  }, [id])

  const placeName = place?.name ?? '장소'

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-gray-400">
        불러오는 중...
      </div>
    )
  }

  return (
    <div className="relative flex flex-col h-full bg-gray-50">
      <header className="shrink-0 flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-200">
        <button type="button" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-6 h-6 text-gray-700" />
        </button>
        <h1 className="text-lg font-bold">{placeName}</h1>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {posts.length === 0 ? (
          <div className="flex items-center justify-center h-full text-sm text-gray-400">
            아직 작성된 글이 없습니다.
          </div>
        ) : (
          posts.map((post) => {
            const firstText = post.content_blocks.find(
              (b) => b.type === 'text' && b.text?.trim(),
            )
            return (
              <Link
                key={post.id}
                to={`/spots/${id}/posts/${post.id}`}
                className="flex gap-3 bg-white rounded-xl p-3 shadow-sm"
              >
                {post.thumbnail_url && (
                  <img
                    src={post.thumbnail_url}
                    alt="썸네일"
                    className="w-20 h-20 rounded-lg object-cover shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 line-clamp-1">
                    {post.title}
                    {post.comment_count > 0 && (
                      <span className="ml-1 text-blue-500 font-normal">
                        ({post.comment_count})
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">
                    {firstText?.text ?? ''}
                  </p>
                  <div className="flex items-center justify-between mt-1.5 text-xs text-gray-400">
                    <span>{post.author_nickname}</span>
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <ThumbsUp className="w-3.5 h-3.5" />
                        {post.likes_count}
                      </span>
                      <span>
                        {new Date(post.created_at).toLocaleDateString('ko-KR')}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            )
          })
        )}
      </div>

      {loggedIn && (
        <Link
          to={`/spots/${id}/posts/new`}
          className="absolute bottom-6 right-4 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center"
        >
          <Plus className="w-7 h-7" />
        </Link>
      )}
    </div>
  )
}
