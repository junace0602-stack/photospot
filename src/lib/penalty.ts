/* ──────────────────────────────────────────────────
   제재 시스템
   - 1차 적발: 3일 정지
   - 2차 적발: 7일 정지
   - 3차 적발: 영구 정지
   ────────────────────────────────────────────────── */

import { supabase } from './supabase'

export type PenaltyType = 'warning' | '3day' | '7day' | 'permanent'

export interface UserPenalty {
  id: string
  user_id: string
  reason: string
  penalty_type: PenaltyType
  created_at: string
  expires_at: string | null
  created_by: string | null
}

export interface SuspensionStatus {
  isSuspended: boolean
  suspendedUntil: Date | null
  message: string | null
}

/** 정지 기간 계산 */
function calculateExpiry(penaltyType: PenaltyType): Date | null {
  const now = new Date()
  switch (penaltyType) {
    case '3day':
      return new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)
    case '7day':
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    case 'permanent':
      return null // 영구 정지
    default:
      return null
  }
}

/** 제재 횟수에 따른 제재 유형 결정 */
export function getPenaltyTypeByCount(count: number): PenaltyType {
  if (count === 0) return '3day' // 1차: 3일
  if (count === 1) return '7day' // 2차: 7일
  return 'permanent' // 3차 이상: 영구
}

/** 유저에게 제재 적용 */
export async function applyPenalty(
  userId: string,
  reason: string,
  adminId: string,
): Promise<{ success: boolean; penaltyType: PenaltyType; error?: string }> {
  try {
    // 현재 제재 횟수 조회
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('penalty_count')
      .eq('id', userId)
      .single()

    if (profileError) {
      return { success: false, penaltyType: '3day', error: '유저 정보를 찾을 수 없습니다.' }
    }

    const currentCount = profile?.penalty_count ?? 0
    const penaltyType = getPenaltyTypeByCount(currentCount)
    const expiresAt = calculateExpiry(penaltyType)

    // user_penalties에 기록
    const { error: penaltyError } = await supabase.from('user_penalties').insert({
      user_id: userId,
      reason,
      penalty_type: penaltyType,
      expires_at: expiresAt?.toISOString() ?? null,
      created_by: adminId,
    })

    if (penaltyError) {
      return { success: false, penaltyType, error: '제재 기록 실패' }
    }

    // profiles 업데이트
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        penalty_count: currentCount + 1,
        suspended_until: penaltyType === 'permanent' ? '9999-12-31T23:59:59Z' : expiresAt?.toISOString(),
      })
      .eq('id', userId)

    if (updateError) {
      return { success: false, penaltyType, error: '프로필 업데이트 실패' }
    }

    return { success: true, penaltyType }
  } catch {
    return { success: false, penaltyType: '3day', error: '알 수 없는 오류' }
  }
}

/** 유저의 정지 상태 확인 */
export async function checkSuspension(userId: string): Promise<SuspensionStatus> {
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('suspended_until')
      .eq('id', userId)
      .single()

    if (error || !profile?.suspended_until) {
      return { isSuspended: false, suspendedUntil: null, message: null }
    }

    const suspendedUntil = new Date(profile.suspended_until)
    const now = new Date()

    // 영구 정지 체크 (9999년)
    if (suspendedUntil.getFullYear() === 9999) {
      return {
        isSuspended: true,
        suspendedUntil: null,
        message: '계정이 영구 정지되었습니다.',
      }
    }

    // 기간 정지 체크
    if (suspendedUntil > now) {
      const dateStr = suspendedUntil.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
      return {
        isSuspended: true,
        suspendedUntil,
        message: `계정이 정지되었습니다. 해제일: ${dateStr}`,
      }
    }

    // 정지 기간 만료 → 자동 해제
    await supabase
      .from('profiles')
      .update({ suspended_until: null })
      .eq('id', userId)

    return { isSuspended: false, suspendedUntil: null, message: null }
  } catch {
    return { isSuspended: false, suspendedUntil: null, message: null }
  }
}

/** 제재 해제 */
export async function removePenalty(userId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ suspended_until: null })
      .eq('id', userId)

    return !error
  } catch {
    return false
  }
}

/** 유저의 제재 이력 조회 */
export async function getPenaltyHistory(userId: string): Promise<UserPenalty[]> {
  const { data, error } = await supabase
    .from('user_penalties')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) return []
  return data as UserPenalty[]
}

/** 제재 유형 한글 변환 */
export function penaltyTypeToKorean(type: PenaltyType): string {
  switch (type) {
    case 'warning':
      return '경고'
    case '3day':
      return '3일 정지'
    case '7day':
      return '7일 정지'
    case 'permanent':
      return '영구 정지'
    default:
      return type
  }
}
