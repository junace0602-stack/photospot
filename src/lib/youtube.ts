/**
 * YouTube URL 감지 및 임베드 관련 유틸리티
 */

// 지원하는 YouTube URL 패턴
const YOUTUBE_PATTERNS = [
  // youtube.com/watch?v=VIDEO_ID
  /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})(?:[&?][^\s]*)?/g,
  // youtu.be/VIDEO_ID
  /(?:https?:\/\/)?(?:www\.)?youtu\.be\/([a-zA-Z0-9_-]{11})(?:[?][^\s]*)?/g,
  // youtube.com/shorts/VIDEO_ID
  /(?:https?:\/\/)?(?:www\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})(?:[?][^\s]*)?/g,
  // youtube.com/embed/VIDEO_ID
  /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})(?:[?][^\s]*)?/g,
]

export interface YouTubeInfo {
  url: string
  videoId: string
  thumbnailUrl: string
  title?: string
}

/**
 * 텍스트에서 유튜브 URL들을 추출
 */
export function extractYouTubeUrls(text: string): YouTubeInfo[] {
  const results: YouTubeInfo[] = []
  const seen = new Set<string>()

  for (const pattern of YOUTUBE_PATTERNS) {
    // 패턴을 복제하여 lastIndex 리셋
    const regex = new RegExp(pattern.source, pattern.flags)
    let match

    while ((match = regex.exec(text)) !== null) {
      const videoId = match[1]
      if (videoId && !seen.has(videoId)) {
        seen.add(videoId)
        results.push({
          url: match[0],
          videoId,
          thumbnailUrl: getYouTubeThumbnail(videoId),
        })
      }
    }
  }

  return results
}

/**
 * YouTube 썸네일 URL 반환
 */
export function getYouTubeThumbnail(videoId: string, quality: 'default' | 'mq' | 'hq' | 'maxres' = 'hq'): string {
  const qualityMap = {
    default: 'default',
    mq: 'mqdefault',
    hq: 'hqdefault',
    maxres: 'maxresdefault',
  }
  return `https://img.youtube.com/vi/${videoId}/${qualityMap[quality]}.jpg`
}

/**
 * YouTube oEmbed API로 영상 제목 가져오기
 */
export async function fetchYouTubeTitle(videoId: string): Promise<string | null> {
  try {
    const url = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
    const res = await fetch(url)
    if (!res.ok) return null
    const data = await res.json()
    return data.title ?? null
  } catch {
    return null
  }
}

/**
 * YouTube 임베드 URL 생성
 */
export function getYouTubeEmbedUrl(videoId: string): string {
  return `https://www.youtube.com/embed/${videoId}?rel=0`
}

/**
 * 비디오 ID로 YouTube URL인지 확인
 */
export function isValidYouTubeId(videoId: string): boolean {
  return /^[a-zA-Z0-9_-]{11}$/.test(videoId)
}
