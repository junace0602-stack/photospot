-- 제재 시스템 마이그레이션
-- Supabase SQL Editor에서 실행하세요

-- 1. user_penalties 테이블 생성
CREATE TABLE IF NOT EXISTS user_penalties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  penalty_type TEXT NOT NULL CHECK (penalty_type IN ('warning', '3day', '7day', 'permanent')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_user_penalties_user_id ON user_penalties(user_id);
CREATE INDEX IF NOT EXISTS idx_user_penalties_created_at ON user_penalties(created_at DESC);

-- 2. profiles 테이블에 제재 관련 컬럼 추가
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS penalty_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS suspended_until TIMESTAMPTZ;

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_profiles_suspended_until ON profiles(suspended_until);

-- 3. RLS 정책 설정
ALTER TABLE user_penalties ENABLE ROW LEVEL SECURITY;

-- 관리자만 제재 내역 조회/수정 가능
CREATE POLICY "Admins can view penalties" ON user_penalties
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'superadmin')
    )
  );

CREATE POLICY "Admins can insert penalties" ON user_penalties
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'superadmin')
    )
  );

CREATE POLICY "Users can view own penalties" ON user_penalties
  FOR SELECT
  USING (user_id = auth.uid());
