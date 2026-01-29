/** 나중에 앱 이름이 정해지면 여기만 바꾸면 됨 */
export const ANON_PREFIX = '익명'

/**
 * 단순 버전 — 목록 페이지 등 게시물 맥락 없이 쓸 때
 */
export function displayName(
  authorNickname: string,
  isAnonymous: boolean,
  isAdmin: boolean,
): string {
  if (!isAnonymous) return authorNickname
  return isAdmin ? `${ANON_PREFIX} (${authorNickname})` : ANON_PREFIX
}

/**
 * 게시글 상세 버전 — 같은 게시물 안에서 익명 유저를 번호로 구분
 *
 * @param opts.isPostAuthor  글 작성자 여부 → "익명(글쓴이)"
 * @param opts.anonNumber    같은 게시물 내 익명 번호 (1, 2, 3…)
 */
export function displayNameInPost(
  authorNickname: string,
  isAnonymous: boolean,
  isAdmin: boolean,
  opts?: { isPostAuthor?: boolean; anonNumber?: number },
): string {
  if (!isAnonymous) return authorNickname

  let label: string
  if (opts?.isPostAuthor) {
    label = `${ANON_PREFIX}(글쓴이)`
  } else if (opts?.anonNumber != null) {
    label = `${ANON_PREFIX}${opts.anonNumber}`
  } else {
    label = ANON_PREFIX
  }

  return isAdmin ? `${label} (${authorNickname})` : label
}

/**
 * 댓글 목록에서 익명 유저에게 고유 번호를 부여하는 맵을 생성한다.
 * - 글 작성자는 "글쓴이" 라벨이므로 번호에서 제외
 * - 같은 user_id → 같은 번호, 등장 순서대로 1부터 증가
 */
export function buildAnonMap(
  postUserId: string,
  comments: { user_id: string; is_anonymous: boolean }[],
): Map<string, number> {
  const map = new Map<string, number>()
  let counter = 1
  for (const c of comments) {
    if (!c.is_anonymous || c.user_id === postUserId) continue
    if (!map.has(c.user_id)) {
      map.set(c.user_id, counter++)
    }
  }
  return map
}
