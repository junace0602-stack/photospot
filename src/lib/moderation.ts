/* ──────────────────────────────────────────────────
   콘텐츠 검열 시스템
   1단계: 한국어 금칙어 필터
   2단계: OpenAI Moderation API
   3단계: Google Cloud Vision SafeSearch (이미지)
   ────────────────────────────────────────────────── */

const OPENAI_KEY = import.meta.env.VITE_OPENAI_API_KEY as string | undefined
const VISION_KEY = import.meta.env.VITE_GOOGLE_VISION_API_KEY as string | undefined

export interface ModerationResult {
  blocked: boolean
  message?: string
}

/* ── 1단계: 금칙어 ─────────────────────────────────── */

const BANNED_WORDS: string[] = [
  // 정치 키워드만 차단 (욕설은 허용)
  '윤석열', '이재명', '국힘', '국민의힘',
  '민주당', '더불어민주당',
  '빨갱이', '수꼴', '틀딱', '한남', '한녀',
  '좌파', '우파', '좌좀', '우좀',
  '문재인', '박근혜',
]

// 초성 자모 분해 맵 (ㄱ~ㅎ)
const CHOSUNG = [
  'ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ',
  'ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ',
]

/** 한글 문자열의 초성만 추출 */
function extractChosung(str: string): string {
  return Array.from(str).map((ch) => {
    const code = ch.charCodeAt(0) - 0xAC00
    if (code < 0 || code > 11171) return ch
    return CHOSUNG[Math.floor(code / 588)]
  }).join('')
}

/** 공백·특수문자 제거 후 정규화 */
function normalize(text: string): string {
  return text.replace(/[\s!@#$%^&*()_+=\-.,;:'"<>?/\\|`~\[\]{}]/g, '').toLowerCase()
}

export function checkBannedWords(text: string): ModerationResult {
  const normalized = normalize(text)
  const chosung = extractChosung(normalized)

  for (const word of BANNED_WORDS) {
    const nw = normalize(word)
    if (normalized.includes(nw) || chosung.includes(nw)) {
      return { blocked: true, message: '부적절한 표현이 포함되어 있습니다.' }
    }
  }
  return { blocked: false }
}

/* ── 2단계: OpenAI Moderation API ─────────────────── */

// 차단할 카테고리 (성인물, 폭력, 자해만 차단 / 욕설·혐오는 허용)
const BLOCKED_CATEGORIES = new Set([
  'sexual',
  'sexual/minors',
  'violence',
  'violence/graphic',
  'self-harm',
  'self-harm/intent',
  'self-harm/instructions',
])

export async function checkOpenAIModeration(text: string): Promise<ModerationResult> {
  if (!OPENAI_KEY) {
    return { blocked: false }
  }

  try {
    const res = await fetch('https://api.openai.com/v1/moderations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_KEY}`,
      },
      body: JSON.stringify({ input: text }),
    })

    if (!res.ok) {
      return { blocked: false }
    }

    const data = await res.json()
    const result = data.results?.[0]

    if (!result) return { blocked: false }

    // 차단 대상 카테고리만 확인
    const flaggedCategories = Object.entries(result.categories ?? {})
      .filter(([, v]) => v)
      .map(([k]) => k)

    const shouldBlock = flaggedCategories.some((cat) => BLOCKED_CATEGORIES.has(cat))

    if (shouldBlock) {
      return {
        blocked: true,
        message: '커뮤니티 가이드라인에 맞지 않는 내용입니다.',
      }
    }

    return { blocked: false }
  } catch {
    return { blocked: false }
  }
}

/* ── 통합 텍스트 검열 ─────────────────────────────── */

export async function moderateText(text: string): Promise<ModerationResult> {
  try {
    // 1단계: 금칙어
    const banned = checkBannedWords(text)
    if (banned.blocked) {
      return banned
    }

    // 2단계: OpenAI
    try {
      const ai = await checkOpenAIModeration(text)
      if (ai.blocked) return ai
    } catch {
      // OpenAI 실패시 통과 처리
    }

    return { blocked: false }
  } catch {
    return { blocked: false }
  }
}

/* ── 3단계: Google Vision SafeSearch ──────────────── */

type Likelihood = 'UNKNOWN' | 'VERY_UNLIKELY' | 'UNLIKELY' | 'POSSIBLE' | 'LIKELY' | 'VERY_LIKELY'

const BLOCK_THRESHOLD: Set<Likelihood> = new Set(['LIKELY', 'VERY_LIKELY'])

interface SafeSearchAnnotation {
  adult: Likelihood
  violence: Likelihood
  racy: Likelihood
  medical: Likelihood
  spoof: Likelihood
}

/** File → base64 */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      // data:image/...;base64,XXXX → XXXX 부분만
      resolve(result.split(',')[1])
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/* ── 4단계: 링크 제한 ────────────────────────────────── */

// 허용되는 링크 패턴
const ALLOWED_LINK_PATTERN = /open\.kakao\.com/i

// URL 패턴 감지 (http, https, www, 주요 도메인)
const URL_PATTERNS = [
  /https?:\/\/[^\s]+/gi,
  /www\.[^\s]+/gi,
  /[a-zA-Z0-9-]+\.(com|co\.kr|kr|net|org|io|me|xyz|info|biz|cc|tv|app|dev|shop|store)[^\s]*/gi,
]

export function checkLinks(text: string): ModerationResult {
  // 모든 URL 패턴 찾기
  const allLinks: string[] = []
  for (const pattern of URL_PATTERNS) {
    const matches = text.match(pattern)
    if (matches) allLinks.push(...matches)
  }

  if (allLinks.length === 0) return { blocked: false }

  // 허용되지 않은 링크가 있는지 확인
  const blockedLinks = allLinks.filter((link) => !ALLOWED_LINK_PATTERN.test(link))

  if (blockedLinks.length > 0) {
    return {
      blocked: true,
      message: '외부 링크는 카카오톡 오픈채팅(open.kakao.com)만 허용됩니다.',
    }
  }

  return { blocked: false }
}

/* ── 5단계: 중복 글 감지 ─────────────────────────────── */

import { supabase } from './supabase'

/** 두 문자열의 유사도 계산 (0~1) */
function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().replace(/\s+/g, '')
  const s2 = str2.toLowerCase().replace(/\s+/g, '')

  if (s1 === s2) return 1
  if (s1.length === 0 || s2.length === 0) return 0

  // Levenshtein distance 기반 유사도
  const len1 = s1.length
  const len2 = s2.length
  const matrix: number[][] = []

  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i]
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j
  }

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      )
    }
  }

  const distance = matrix[len1][len2]
  const maxLen = Math.max(len1, len2)
  return 1 - distance / maxLen
}

export async function checkDuplicatePost(
  userId: string,
  title: string,
  content: string,
): Promise<ModerationResult> {
  try {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const currentText = `${title} ${content}`

    // 최근 24시간 내 내 글 조회 (출사지 글 + 커뮤니티 글)
    const [postsRes, communityRes] = await Promise.all([
      supabase
        .from('posts')
        .select('title, content_blocks')
        .eq('user_id', userId)
        .gte('created_at', oneDayAgo),
      supabase
        .from('community_posts')
        .select('title, content')
        .eq('user_id', userId)
        .gte('created_at', oneDayAgo),
    ])

    // 출사지 글 비교
    for (const post of postsRes.data ?? []) {
      const blocks = post.content_blocks as { type: string; text?: string }[]
      const postContent = blocks
        ?.filter((b) => b.type === 'text')
        .map((b) => b.text ?? '')
        .join(' ') ?? ''
      const postText = `${post.title} ${postContent}`

      if (calculateSimilarity(currentText, postText) >= 0.8) {
        return {
          blocked: true,
          message: '이미 비슷한 내용의 글을 작성하셨습니다.',
        }
      }
    }

    // 커뮤니티 글 비교
    for (const post of communityRes.data ?? []) {
      const postText = `${post.title} ${post.content ?? ''}`

      if (calculateSimilarity(currentText, postText) >= 0.8) {
        return {
          blocked: true,
          message: '이미 비슷한 내용의 글을 작성하셨습니다.',
        }
      }
    }

    return { blocked: false }
  } catch {
    // 에러 발생 시 통과 처리
    return { blocked: false }
  }
}

export async function checkDuplicateComment(
  userId: string,
  content: string,
): Promise<ModerationResult> {
  try {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    // 최근 24시간 내 내 댓글 조회
    const [commentsRes, communityCommentsRes] = await Promise.all([
      supabase
        .from('comments')
        .select('content')
        .eq('user_id', userId)
        .gte('created_at', oneDayAgo),
      supabase
        .from('community_comments')
        .select('content')
        .eq('user_id', userId)
        .gte('created_at', oneDayAgo),
    ])

    const allComments = [
      ...(commentsRes.data ?? []),
      ...(communityCommentsRes.data ?? []),
    ]

    for (const comment of allComments) {
      if (calculateSimilarity(content, comment.content) >= 0.8) {
        return {
          blocked: true,
          message: '이미 비슷한 내용의 글을 작성하셨습니다.',
        }
      }
    }

    return { blocked: false }
  } catch {
    // 에러 발생 시 통과 처리
    return { blocked: false }
  }
}

/* ── 3단계: Google Vision SafeSearch ──────────────── */

export async function moderateImage(file: File): Promise<ModerationResult> {
  if (!VISION_KEY) {
    return { blocked: false }
  }

  try {
    const base64 = await fileToBase64(file)

    const res = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${VISION_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: [
            {
              image: { content: base64 },
              features: [{ type: 'SAFE_SEARCH_DETECTION' }],
            },
          ],
        }),
      },
    )

    if (!res.ok) {
      return { blocked: false }
    }

    const data = await res.json()
    const annotation: SafeSearchAnnotation | undefined =
      data.responses?.[0]?.safeSearchAnnotation

    if (!annotation) return { blocked: false }

    const flagged =
      BLOCK_THRESHOLD.has(annotation.adult) ||
      BLOCK_THRESHOLD.has(annotation.violence) ||
      BLOCK_THRESHOLD.has(annotation.racy) ||
      BLOCK_THRESHOLD.has(annotation.medical)

    if (flagged) {
      return {
        blocked: true,
        message: '커뮤니티 가이드라인에 맞지 않는 이미지입니다.',
      }
    }

    return { blocked: false }
  } catch {
    return { blocked: false }
  }
}
