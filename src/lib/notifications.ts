import { supabase } from './supabase'

/**
 * 댓글 알림 생성
 * - 글 작성자의 user_settings.notify_comment 확인
 * - 자기 글에 자기가 댓글 달면 알림 안 함
 */
export async function notifyComment(
  postAuthorId: string,
  commenterId: string,
  postTitle: string,
  link: string,
) {
  if (postAuthorId === commenterId) return

  // 설정 확인
  const { data: settings } = await supabase
    .from('user_settings')
    .select('notify_comment')
    .eq('user_id', postAuthorId)
    .maybeSingle()

  // 설정이 없으면 기본 ON, 있으면 값 확인
  if (settings && settings.notify_comment === false) return

  await supabase.from('notifications').insert({
    user_id: postAuthorId,
    type: 'comment',
    message: `"${postTitle.slice(0, 30)}" 글에 새 댓글이 달렸습니다.`,
    link,
  })
}

/**
 * 답글 알림 생성
 * - 댓글 작성자의 user_settings.notify_reply 확인
 * - 자기 댓글에 자기가 답글 달면 알림 안 함
 */
export async function notifyReply(
  commentAuthorId: string,
  replierId: string,
  postTitle: string,
  link: string,
) {
  if (commentAuthorId === replierId) return

  // 설정 확인
  const { data: settings } = await supabase
    .from('user_settings')
    .select('notify_reply')
    .eq('user_id', commentAuthorId)
    .maybeSingle()

  // 설정이 없으면 기본 ON, 있으면 값 확인
  if (settings && settings.notify_reply === false) return

  await supabase.from('notifications').insert({
    user_id: commentAuthorId,
    type: 'reply',
    message: `"${postTitle.slice(0, 30)}" 글의 댓글에 답글이 달렸습니다.`,
    link,
  })
}

/**
 * 추천 알림 생성
 * - 글 작성자의 user_settings.notify_like 확인
 * - 자기 글에 자기가 추천하면 알림 안 함
 */
export async function notifyLike(
  postAuthorId: string,
  likerId: string,
  postTitle: string,
  link: string,
) {
  if (postAuthorId === likerId) return

  // 설정 확인
  const { data: settings } = await supabase
    .from('user_settings')
    .select('notify_like')
    .eq('user_id', postAuthorId)
    .maybeSingle()

  // 설정이 없으면 기본 ON, 있으면 값 확인
  if (settings && settings.notify_like === false) return

  await supabase.from('notifications').insert({
    user_id: postAuthorId,
    type: 'like',
    message: `"${postTitle.slice(0, 30)}" 글이 추천을 받았습니다.`,
    link,
  })
}

/**
 * 인기글 알림 생성 (좋아요 10개 도달 시)
 */
export async function notifyPopular(
  postAuthorId: string,
  postTitle: string,
  link: string,
  likeCount: number,
) {
  if (likeCount !== 10) return // 정확히 10일 때만

  const { data: settings } = await supabase
    .from('user_settings')
    .select('notify_like')
    .eq('user_id', postAuthorId)
    .maybeSingle()

  if (settings && settings.notify_like === false) return

  // 중복 방지
  const { data: existing } = await supabase
    .from('notifications')
    .select('id')
    .eq('user_id', postAuthorId)
    .eq('type', 'popular')
    .eq('link', link)
    .maybeSingle()

  if (existing) return

  await supabase.from('notifications').insert({
    user_id: postAuthorId,
    type: 'popular',
    message: `"${postTitle.slice(0, 30)}" 글이 인기글이 되었습니다!`,
    link,
  })
}
