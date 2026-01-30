import { supabase } from './supabase'

/**
 * 2위 권한 부여 체크 및 실행
 * 1위의 권한이 만료되었고, 해당 기간에 새 챌린지를 만들지 않았다면
 * 2위에게 24시간 권한을 부여합니다.
 *
 * 이 함수는 이상적으로는 서버사이드 cron job에서 실행되어야 하지만,
 * 클라이언트에서도 주기적으로 호출할 수 있습니다.
 */
export async function checkAndGrantSecondPlacePermission(): Promise<void> {
  const now = new Date()

  // 1. 결과가 발표된 챌린지 중에서:
  //    - 1위가 있고
  //    - 2위가 있고
  //    - 1위의 권한이 만료된 경우 찾기
  const { data: events } = await supabase
    .from('events')
    .select('id, title, winner_id, second_place_id, result_announced, created_at')
    .eq('result_announced', true)
    .not('winner_id', 'is', null)
    .not('second_place_id', 'is', null)

  if (!events || events.length === 0) return

  for (const event of events) {
    // 1위 프로필 확인
    const { data: winnerProfile } = await supabase
      .from('profiles')
      .select('id, challenge_permission_until')
      .eq('id', event.winner_id)
      .single()

    if (!winnerProfile) continue

    // 1위 권한이 아직 유효하면 스킵
    if (winnerProfile.challenge_permission_until) {
      const permissionEnd = new Date(winnerProfile.challenge_permission_until)
      if (permissionEnd > now) continue
    }

    // 1위 권한이 만료됨 - 이 챌린지 이후에 새 챌린지를 만들었는지 확인
    const { count: newChallengeCount } = await supabase
      .from('events')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', event.winner_id)
      .gt('created_at', event.created_at)

    // 1위가 새 챌린지를 만들었으면 스킵
    if (newChallengeCount && newChallengeCount > 0) continue

    // 2위 프로필 확인
    const { data: secondProfile } = await supabase
      .from('profiles')
      .select('id, challenge_permission_until')
      .eq('id', event.second_place_id)
      .single()

    if (!secondProfile) continue

    // 2위가 이미 권한이 있으면 스킵
    if (secondProfile.challenge_permission_until) {
      const secondPermissionEnd = new Date(secondProfile.challenge_permission_until)
      if (secondPermissionEnd > now) continue
    }

    // 2위에게 24시간 권한 부여
    const permissionUntil = new Date()
    permissionUntil.setHours(permissionUntil.getHours() + 24)

    await supabase.from('profiles').update({
      challenge_permission_until: permissionUntil.toISOString(),
    }).eq('id', event.second_place_id)

    // 2위에게 알림
    await supabase.from('notifications').insert({
      user_id: event.second_place_id,
      type: 'challenge_permission',
      message: `🎉 "${event.title}" 챌린지 1위가 챌린지를 개최하지 않아 24시간 동안 챌린지 개최 권한이 부여되었습니다!`,
      link: '/events/new',
    })
  }
}
