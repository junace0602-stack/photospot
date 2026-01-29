import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, ThumbsUp, Pencil, Trash2, Star, Bookmark, Clock } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import type { Post, Comment, Place } from '../lib/types'

const TITLES: Record<string, string> = {
  posts: '내가 쓴 글',
  comments: '내가 쓴 댓글',
  likes: '내가 추천한 글',
  favorites: '즐겨찾기',
  scraps: '스크랩한 글',
  recent: '최근 본 글',
  commented: '댓글 단 글',
}

type CommentWithPost = Comment & { posts?: { title: string; place_id: string } }

interface CommunityPostItem {
  id: string
  title: string
  section: string
  author_nickname: string
  likes_count: number
  comment_count: number
  created_at: string
  thumbnail_url: string | null
}

export default function MyActivityPage() {
  const { type } = useParams<{ type: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [posts, setPosts] = useState<Post[]>([])
  const [communityPosts, setCommunityPosts] = useState<CommunityPostItem[]>([])
  const [comments, setComments] = useState<CommentWithPost[]>([])
  const [places, setPlaces] = useState<Place[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!type) return
    setLoading(true)
    setPosts([])
    setCommunityPosts([])
    setComments([])
    setPlaces([])

    // 최근 본 글은 로그인 없이도 가능 (localStorage 기반)
    if (type === 'recent') {
      const recentIds = JSON.parse(localStorage.getItem('recentPosts') || '[]') as string[]
      if (recentIds.length === 0) {
        setLoading(false)
        return
      }
      supabase
        .from('community_posts')
        .select('id, title, section, author_nickname, likes_count, comment_count, created_at, thumbnail_url')
        .in('id', recentIds)
        .then(({ data }) => {
          // 최근 순서 유지
          const map = new Map((data ?? []).map(d => [d.id, d]))
          const sorted = recentIds
            .map(id => map.get(id))
            .filter((p): p is CommunityPostItem => !!p)
          setCommunityPosts(sorted)
          setLoading(false)
        })
      return
    }

    if (!user) {
      setLoading(false)
      return
    }

    if (type === 'posts') {
      supabase
        .from('posts')
        .select('*, places(name, lat, lng)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .then(({ data }) => {
          setPosts((data ?? []) as Post[])
          setLoading(false)
        })
    } else if (type === 'comments') {
      supabase
        .from('comments')
        .select('*, posts(title, place_id)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .then(({ data }) => {
          setComments((data ?? []) as CommentWithPost[])
          setLoading(false)
        })
    } else if (type === 'likes') {
      supabase
        .from('likes')
        .select('post_id')
        .eq('user_id', user.id)
        .then(({ data }) => {
          const ids = (data ?? []).map((d) => d.post_id)
          if (ids.length === 0) {
            setPosts([])
            setLoading(false)
            return
          }
          supabase
            .from('posts')
            .select('*, places(name, lat, lng)')
            .in('id', ids)
            .order('created_at', { ascending: false })
            .then(({ data: p }) => {
              setPosts((p ?? []) as Post[])
              setLoading(false)
            })
        })
    } else if (type === 'favorites') {
      supabase
        .from('favorites')
        .select('place_id')
        .eq('user_id', user.id)
        .then(({ data }) => {
          const ids = (data ?? []).map((d) => d.place_id)
          if (ids.length === 0) {
            setPlaces([])
            setLoading(false)
            return
          }
          supabase
            .from('places')
            .select('*')
            .in('id', ids)
            .order('name')
            .then(({ data: p }) => {
              setPlaces((p ?? []) as Place[])
              setLoading(false)
            })
        })
    } else if (type === 'scraps') {
      supabase
        .from('scraps')
        .select('post_id, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .then(({ data }) => {
          const ids = (data ?? []).map((d) => d.post_id)
          if (ids.length === 0) {
            setCommunityPosts([])
            setLoading(false)
            return
          }
          supabase
            .from('community_posts')
            .select('id, title, section, author_nickname, likes_count, comment_count, created_at, thumbnail_url')
            .in('id', ids)
            .then(({ data: p }) => {
              // scrap 순서 유지
              const map = new Map((p ?? []).map(post => [post.id, post]))
              const sorted = ids
                .map(id => map.get(id))
                .filter((post): post is CommunityPostItem => !!post)
              setCommunityPosts(sorted)
              setLoading(false)
            })
        })
    } else if (type === 'commented') {
      // 내가 댓글 단 커뮤니티 글 조회
      supabase
        .from('community_comments')
        .select('community_post_id, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .then(({ data }) => {
          // 중복 제거 (같은 글에 여러 댓글을 달았을 수 있음)
          const uniqueIds = [...new Set((data ?? []).map((d) => d.community_post_id))]
          if (uniqueIds.length === 0) {
            setCommunityPosts([])
            setLoading(false)
            return
          }
          supabase
            .from('community_posts')
            .select('id, title, section, author_nickname, likes_count, comment_count, created_at, thumbnail_url')
            .in('id', uniqueIds)
            .then(({ data: p }) => {
              // 최근 댓글 단 순서 유지
              const map = new Map((p ?? []).map(post => [post.id, post]))
              const sorted = uniqueIds
                .map(id => map.get(id))
                .filter((post): post is CommunityPostItem => !!post)
              setCommunityPosts(sorted)
              setLoading(false)
            })
        })
    }
  }, [type, user])

  const deletePost = async (post: Post) => {
    if (!confirm('이 글을 삭제하시겠습니까?')) return
    const { error } = await supabase.from('posts').delete().eq('id', post.id)
    if (error) {
      toast.error('삭제 실패: ' + error.message)
      return
    }
    setPosts((prev) => prev.filter((p) => p.id !== post.id))
  }

  const deleteComment = async (comment: CommentWithPost) => {
    if (!confirm('이 댓글을 삭제하시겠습니까?')) return
    const { error } = await supabase.from('comments').delete().eq('id', comment.id)
    if (error) {
      toast.error('삭제 실패: ' + error.message)
      return
    }
    // comment_count 감소
    const rpcResult = await supabase.rpc('decrement_comment_count', { p_post_id: comment.post_id })
    if (rpcResult.error) {
      // rpc 없으면 직접 업데이트
      const { data } = await supabase
        .from('posts')
        .select('comment_count')
        .eq('id', comment.post_id)
        .single()
      if (data) {
        await supabase
          .from('posts')
          .update({ comment_count: Math.max(0, data.comment_count - 1) })
          .eq('id', comment.post_id)
      }
    }
    setComments((prev) => prev.filter((c) => c.id !== comment.id))
  }

  const unlikePost = async (post: Post) => {
    if (!user || !confirm('추천을 취소하시겠습니까?')) return
    await supabase.from('likes').delete().eq('post_id', post.id).eq('user_id', user.id)
    // likes_count 감소
    await supabase
      .from('posts')
      .update({ likes_count: Math.max(0, post.likes_count - 1) })
      .eq('id', post.id)
    setPosts((prev) => prev.filter((p) => p.id !== post.id))
  }

  const unfavoritePlace = async (place: Place) => {
    if (!user || !confirm('즐겨찾기를 해제하시겠습니까?')) return
    await supabase
      .from('favorites')
      .delete()
      .eq('user_id', user.id)
      .eq('place_id', place.id)
    setPlaces((prev) => prev.filter((p) => p.id !== place.id))
  }

  const unscrapPost = async (post: CommunityPostItem) => {
    if (!user || !confirm('스크랩을 취소하시겠습니까?')) return
    await supabase.from('scraps').delete().eq('post_id', post.id).eq('user_id', user.id)
    setCommunityPosts((prev) => prev.filter((p) => p.id !== post.id))
  }

  const removeFromRecent = (postId: string) => {
    const recentIds = JSON.parse(localStorage.getItem('recentPosts') || '[]') as string[]
    const updated = recentIds.filter(id => id !== postId)
    localStorage.setItem('recentPosts', JSON.stringify(updated))
    setCommunityPosts((prev) => prev.filter((p) => p.id !== postId))
  }

  const getEmptyMessage = () => {
    switch (type) {
      case 'posts': return '작성한 글이 없습니다.'
      case 'comments': return '작성한 댓글이 없습니다.'
      case 'likes': return '추천한 글이 없습니다.'
      case 'favorites': return '즐겨찾기한 장소가 없습니다.'
      case 'scraps': return '스크랩한 글이 없습니다.'
      case 'recent': return '최근 본 글이 없습니다.'
      case 'commented': return '댓글 단 글이 없습니다.'
      default: return '데이터가 없습니다.'
    }
  }

  // 커뮤니티 포스트 렌더링 (스크랩, 최근 본 글)
  const renderCommunityPosts = () => {
    if (communityPosts.length === 0) {
      return <p className="text-sm text-gray-400 text-center py-12">{getEmptyMessage()}</p>
    }

    return communityPosts.map((post) => (
      <div
        key={post.id}
        className="flex items-start gap-3 px-4 py-3 bg-white border-b border-gray-100"
      >
        <Link to={`/community/${post.id}`} className="flex-1 min-w-0">
          <p className="text-sm text-gray-900 line-clamp-1">
            <span className="text-xs text-blue-500 mr-1">[{post.section}]</span>
            {post.title}
            {post.comment_count > 0 && (
              <span className="ml-1 text-blue-500 text-xs">[{post.comment_count}]</span>
            )}
          </p>
          <div className="flex items-center gap-1.5 mt-1 text-xs text-gray-400">
            <span>{post.author_nickname}</span>
            <span>|</span>
            <span>{new Date(post.created_at).toLocaleDateString('ko-KR')}</span>
            <span>|</span>
            <span className="flex items-center gap-0.5">
              <ThumbsUp className="w-3 h-3" />
              {post.likes_count}
            </span>
          </div>
        </Link>
        {type !== 'commented' && (
          <button
            type="button"
            onClick={() => type === 'scraps' ? unscrapPost(post) : removeFromRecent(post.id)}
            className="shrink-0 p-1.5 text-gray-400 hover:text-gray-600"
          >
            {type === 'scraps' ? (
              <Bookmark className="w-4 h-4 fill-amber-400 text-amber-400" />
            ) : (
              <Clock className="w-4 h-4" />
            )}
          </button>
        )}
      </div>
    ))
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <header className="shrink-0 flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-200">
        <button type="button" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-6 h-6 text-gray-700" />
        </button>
        <h1 className="text-lg font-bold">{TITLES[type ?? ''] ?? ''}</h1>
      </header>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <p className="text-sm text-gray-400 text-center py-12">불러오는 중...</p>
        ) : type === 'scraps' || type === 'recent' || type === 'commented' ? (
          renderCommunityPosts()
        ) : type === 'favorites' ? (
          places.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-12">{getEmptyMessage()}</p>
          ) : (
            places.map((place) => (
              <div
                key={place.id}
                className="flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-100"
              >
                <Link
                  to={`/spots/${place.id}`}
                  className="flex-1 min-w-0"
                >
                  <p className="text-sm font-semibold text-gray-900">{place.name}</p>
                </Link>
                <button
                  type="button"
                  onClick={() => unfavoritePlace(place)}
                  className="shrink-0 p-1.5"
                >
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                </button>
              </div>
            ))
          )
        ) : type === 'comments' ? (
          comments.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-12">{getEmptyMessage()}</p>
          ) : (
            comments.map((c) => (
              <div
                key={c.id}
                className="flex items-start gap-3 px-4 py-3 bg-white border-b border-gray-100"
              >
                <Link
                  to={`/spots/${c.posts?.place_id}/posts/${c.post_id}`}
                  className="flex-1 min-w-0"
                >
                  <p className="text-sm text-gray-900 line-clamp-2">{c.content}</p>
                  <div className="flex items-center gap-1.5 mt-1 text-xs text-gray-400">
                    <span className="text-blue-500 line-clamp-1">{c.posts?.title ?? ''}</span>
                    <span>|</span>
                    <span className="shrink-0">
                      {new Date(c.created_at).toLocaleDateString('ko-KR')}
                    </span>
                  </div>
                </Link>
                <button
                  type="button"
                  onClick={() => deleteComment(c)}
                  className="shrink-0 p-1.5 text-gray-400"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )
        ) : posts.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-12">{getEmptyMessage()}</p>
        ) : (
          posts.map((post) => (
            <div
              key={post.id}
              className="flex items-start gap-3 px-4 py-3 bg-white border-b border-gray-100"
            >
              <Link
                to={`/spots/${post.place_id}/posts/${post.id}`}
                className="flex-1 min-w-0"
              >
                <p className="text-sm text-gray-900 line-clamp-1">
                  {post.title}
                  {post.comment_count > 0 && (
                    <span className="ml-1 text-blue-500 text-xs">
                      [{post.comment_count}]
                    </span>
                  )}
                </p>
                <div className="flex items-center gap-1.5 mt-1 text-xs text-gray-400">
                  <span className="text-blue-500">{post.places?.name ?? ''}</span>
                  <span>|</span>
                  <span>
                    {new Date(post.created_at).toLocaleDateString('ko-KR')}
                  </span>
                  <span>|</span>
                  <span className="flex items-center gap-0.5">
                    <ThumbsUp className="w-3 h-3" />
                    {post.likes_count}
                  </span>
                </div>
              </Link>
              <div className="shrink-0 flex items-center gap-1">
                {type === 'posts' && (
                  <button
                    type="button"
                    onClick={() => toast('준비 중입니다.')}
                    className="p-1.5 text-gray-400"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() =>
                    type === 'likes' ? unlikePost(post) : deletePost(post)
                  }
                  className="p-1.5 text-gray-400"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
