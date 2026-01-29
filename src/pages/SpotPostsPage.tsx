import { useEffect, useState, useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Plus, ThumbsUp, MapPin, FileText, Tag } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { Place, Post } from '../lib/types'
import { useAuth } from '../contexts/AuthContext'

function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)}m`
  if (km < 10) return `${km.toFixed(1)}km`
  return `${Math.round(km)}km`
}

// GPS 위치 캐싱 (세션 동안 유지)
let cachedUserPos: { lat: number; lng: number } | null = null

export default function SpotPostsPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { loggedIn } = useAuth()

  const [place, setPlace] = useState<Place | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [userPos, setUserPos] = useState(cachedUserPos)

  // 사용자 위치 가져오기 (캐시 없을 때만)
  useEffect(() => {
    if (cachedUserPos) return // 이미 캐시됨
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const position = { lat: pos.coords.latitude, lng: pos.coords.longitude }
          cachedUserPos = position
          setUserPos(position)
        },
        () => {} // 권한 거부 시 무시
      )
    }
  }, [])

  // 거리 계산 (메모이제이션)
  const distance = useMemo(() => {
    if (!place || !userPos) return null
    return Math.sqrt(
      Math.pow((place.lat - userPos.lat) * 111, 2) +
      Math.pow((place.lng - userPos.lng) * 88, 2)
    )
  }, [place, userPos])

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
      <div className="flex flex-col h-full bg-gray-50">
        <header className="shrink-0 flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-200">
          <button type="button" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-6 h-6 text-gray-700" />
          </button>
          <div className="h-6 w-24 bg-gray-200 rounded animate-pulse" />
        </header>
        <div className="shrink-0 bg-white border-b border-gray-200 p-4">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-xl bg-gray-200 animate-pulse shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-5 w-32 bg-gray-200 rounded animate-pulse" />
              <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
            </div>
          </div>
        </div>
        <div className="flex-1 p-4 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-3 bg-white rounded-xl p-3 shadow-sm">
              <div className="w-20 h-20 rounded-lg bg-gray-200 animate-pulse shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse" />
                <div className="h-3 w-1/2 bg-gray-200 rounded animate-pulse" />
                <div className="h-3 w-1/4 bg-gray-200 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // 대표 이미지 (첫 번째 글의 썸네일)
  const representativeThumbnail = posts[0]?.thumbnail_url

  // 카테고리 추출 (첫 번째 글의 카테고리들)
  const categories = posts[0]?.categories ?? []

  return (
    <div className="relative flex flex-col h-full bg-gray-50">
      <header className="shrink-0 flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-200">
        <button type="button" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-6 h-6 text-gray-700" />
        </button>
        <h1 className="text-lg font-bold">{placeName}</h1>
      </header>

      {/* 상단 배너 */}
      <div className="shrink-0 bg-white border-b border-gray-200 p-4">
        <div className="flex items-center gap-4">
          {/* 썸네일 */}
          {representativeThumbnail ? (
            <img
              src={representativeThumbnail}
              alt={placeName}
              loading="lazy"
              decoding="async"
              className="w-20 h-20 rounded-xl object-cover shrink-0"
            />
          ) : (
            <div className="w-20 h-20 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
              <MapPin className="w-8 h-8 text-blue-500" />
            </div>
          )}
          {/* 정보 */}
          <div className="flex-1 min-w-0">
            <p className="text-lg font-bold text-gray-900 truncate">
              {placeName}
            </p>
            <div className="flex items-center gap-3 mt-1.5 text-sm text-gray-500">
              {distance !== null && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {formatDistance(distance)}
                </span>
              )}
              <span className="flex items-center gap-1">
                <FileText className="w-4 h-4" />
                글 {posts.length}개
              </span>
            </div>
            {/* 카테고리 태그 */}
            {categories.length > 0 && (
              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                <Tag className="w-3.5 h-3.5 text-gray-400" />
                {categories.slice(0, 3).map((cat) => (
                  <span
                    key={cat}
                    className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full"
                  >
                    {cat}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

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
                    loading="lazy"
                    decoding="async"
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
