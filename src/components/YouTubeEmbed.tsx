import { useState, useEffect } from 'react'
import { Play, X } from 'lucide-react'
import { getYouTubeThumbnail, getYouTubeEmbedUrl, fetchYouTubeTitle, type YouTubeInfo } from '../lib/youtube'

interface YouTubeEmbedProps {
  videoId: string
  /** 미리보기 모드 (글 작성 시) - X 버튼 표시 */
  preview?: boolean
  /** X 버튼 클릭 시 */
  onRemove?: () => void
}

export default function YouTubeEmbed({ videoId, preview, onRemove }: YouTubeEmbedProps) {
  const [title, setTitle] = useState<string | null>(null)
  const [playing, setPlaying] = useState(false)
  const [imgError, setImgError] = useState(false)

  console.log('[YouTubeEmbed] Rendering with videoId:', videoId)

  useEffect(() => {
    console.log('[YouTubeEmbed] Fetching title for:', videoId)
    fetchYouTubeTitle(videoId).then((t) => {
      console.log('[YouTubeEmbed] Title fetched:', t)
      setTitle(t)
    })
  }, [videoId])

  const thumbnailUrl = getYouTubeThumbnail(videoId, imgError ? 'mq' : 'hq')

  if (playing) {
    return (
      <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black mb-3">
        <iframe
          src={getYouTubeEmbedUrl(videoId)}
          title={title ?? 'YouTube video'}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 w-full h-full"
        />
      </div>
    )
  }

  return (
    <div className="relative w-full rounded-xl overflow-hidden bg-gray-100 mb-3">
      {/* X 버튼 (미리보기 모드) */}
      {preview && onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="absolute top-2 right-2 z-10 w-7 h-7 bg-black/60 rounded-full flex items-center justify-center hover:bg-black/80"
        >
          <X className="w-4 h-4 text-white" />
        </button>
      )}

      {/* 썸네일 + 재생 버튼 */}
      <button
        type="button"
        onClick={() => setPlaying(true)}
        className="w-full aspect-video relative group"
      >
        <img
          src={thumbnailUrl}
          alt={title ?? 'YouTube thumbnail'}
          className="w-full h-full object-cover"
          onError={() => setImgError(true)}
        />
        {/* 재생 버튼 오버레이 */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
          <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center shadow-lg">
            <Play className="w-8 h-8 text-white fill-white ml-1" />
          </div>
        </div>
      </button>

      {/* 제목 */}
      {title && (
        <div className="px-3 py-2.5 bg-gray-50 border-t border-gray-200">
          <p className="text-sm font-medium text-gray-800 line-clamp-2">{title}</p>
          <p className="text-xs text-gray-400 mt-0.5">YouTube</p>
        </div>
      )}
    </div>
  )
}

/** 여러 유튜브 임베드를 표시하는 컴포넌트 */
export function YouTubeEmbedList({
  videos,
  preview,
  onRemove,
}: {
  videos: YouTubeInfo[]
  preview?: boolean
  onRemove?: (videoId: string) => void
}) {
  console.log('[YouTubeEmbedList] videos:', videos)
  if (videos.length === 0) return null

  return (
    <div className="space-y-3">
      {videos.map((video) => (
        <YouTubeEmbed
          key={video.videoId}
          videoId={video.videoId}
          preview={preview}
          onRemove={onRemove ? () => onRemove(video.videoId) : undefined}
        />
      ))}
    </div>
  )
}
