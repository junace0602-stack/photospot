import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Lock, FileText } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface UserProfile {
  id: string
  nickname: string
  is_profile_public: boolean
}

interface PostItem {
  id: string
  type: 'community' | 'spot'
  spot_id?: string
  section?: string  // 커뮤니티 글의 카테고리 (일반, 사진, 장비, 공지 등)
  title: string
  thumbnail_url: string | null
  created_at: string
  likes_count: number
  comment_count: number
}

export default function UserPostsPage() {
  const navigate = useNavigate()
  const { userId } = useParams<{ userId: string }>()
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [posts, setPosts] = useState<PostItem[]>([])
  const [loading, setLoading] = useState(true)
  const [isPrivate, setIsPrivate] = useState(false)

  useEffect(() => {
    if (!userId) return

    const load = async () => {
      setLoading(true)

      // 유저 프로필 조회
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, nickname, is_profile_public')
        .eq('id', userId)
        .single()

      if (!profile) {
        setLoading(false)
        return
      }

      setUserProfile(profile)

      // 비공개 프로필이면 글 목록 표시 안 함
      if (profile.is_profile_public === false) {
        setIsPrivate(true)
        setLoading(false)
        return
      }

      // 커뮤니티 글 (익명 제외)
      const { data: communityPosts } = await supabase
        .from('community_posts')
        .select('id, section, title, thumbnail_url, created_at, likes_count, comment_count')
        .eq('user_id', userId)
        .eq('is_anonymous', false)
        .order('created_at', { ascending: false })

      // 출사지 글 (익명 제외)
      const { data: spotPosts } = await supabase
        .from('posts')
        .select('id, place_id, title, thumbnail_url, created_at, likes_count, comment_count')
        .eq('user_id', userId)
        .eq('is_anonymous', false)
        .order('created_at', { ascending: false })

      // 합쳐서 최신순 정렬
      const allPosts: PostItem[] = [
        ...(communityPosts ?? []).map((p) => ({
          id: p.id,
          type: 'community' as const,
          section: p.section,
          title: p.title,
          thumbnail_url: p.thumbnail_url,
          created_at: p.created_at,
          likes_count: p.likes_count ?? 0,
          comment_count: p.comment_count ?? 0,
        })),
        ...(spotPosts ?? []).map((p) => ({
          id: p.id,
          type: 'spot' as const,
          spot_id: p.place_id,
          title: p.title,
          thumbnail_url: p.thumbnail_url,
          created_at: p.created_at,
          likes_count: p.likes_count ?? 0,
          comment_count: p.comment_count ?? 0,
        })),
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

      setPosts(allPosts)
      setLoading(false)
    }

    load()
  }, [userId])

  const handlePostClick = (post: PostItem) => {
    if (post.type === 'community') {
      navigate(`/community/${post.id}`)
    } else if (post.spot_id) {
      navigate(`/spots/${post.spot_id}/posts/${post.id}`)
    }
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <header className="shrink-0 flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-200">
        <button type="button" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-6 h-6 text-gray-700" />
        </button>
        <h1 className="text-lg font-bold">
          {userProfile?.nickname ?? '사용자'} 님의 글
        </h1>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : isPrivate ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 px-8">
            <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center">
              <Lock className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-500 text-sm">비공개 프로필입니다</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 px-8">
            <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center">
              <FileText className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-500 text-sm">작성한 글이 없습니다</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {posts.map((post) => (
              <button
                key={`${post.type}-${post.id}`}
                type="button"
                onClick={() => handlePostClick(post)}
                className="w-full flex items-center gap-3 p-4 bg-white hover:bg-gray-50 text-left"
              >
                {post.thumbnail_url ? (
                  <img
                    src={post.thumbnail_url}
                    alt=""
                    className="w-16 h-16 rounded-lg object-cover bg-gray-100 shrink-0"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                    <FileText className="w-6 h-6 text-gray-300" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {post.title}
                  </p>
                  <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                    <span>{new Date(post.created_at).toLocaleDateString('ko-KR')}</span>
                    <span>·</span>
                    <span>추천 {post.likes_count}</span>
                    <span>·</span>
                    <span>댓글 {post.comment_count}</span>
                  </div>
                  <span className="inline-block mt-1 px-1.5 py-0.5 text-[10px] rounded bg-gray-100 text-gray-500">
                    {post.type === 'spot' ? '출사지' : (post.section ?? '일반')}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
