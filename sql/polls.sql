-- 투표 기능을 위한 테이블 생성
-- 이 SQL을 Supabase SQL Editor에서 실행하세요

-- polls 테이블: 투표 정보
CREATE TABLE polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES community_posts(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  allow_multiple BOOLEAN DEFAULT false,
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- poll_options 테이블: 투표 선택지
CREATE TABLE poll_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID REFERENCES polls(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  position INTEGER DEFAULT 0
);

-- poll_votes 테이블: 투표 기록
CREATE TABLE poll_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID REFERENCES polls(id) ON DELETE CASCADE,
  option_id UUID REFERENCES poll_options(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(poll_id, option_id, user_id)  -- 같은 옵션에 중복 투표 방지
);

-- 인덱스 추가 (성능 최적화)
CREATE INDEX idx_polls_post_id ON polls(post_id);
CREATE INDEX idx_poll_options_poll_id ON poll_options(poll_id);
CREATE INDEX idx_poll_votes_poll_id ON poll_votes(poll_id);
CREATE INDEX idx_poll_votes_user_id ON poll_votes(user_id);

-- RLS 활성화
ALTER TABLE polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_votes ENABLE ROW LEVEL SECURITY;

-- polls 정책
CREATE POLICY "Anyone can read polls" ON polls
  FOR SELECT USING (true);

CREATE POLICY "Post author can create polls" ON polls
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM community_posts
      WHERE id = post_id AND user_id = auth.uid()
    )
  );

-- poll_options 정책
CREATE POLICY "Anyone can read poll_options" ON poll_options
  FOR SELECT USING (true);

CREATE POLICY "Poll creator can insert options" ON poll_options
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM polls p
      JOIN community_posts cp ON p.post_id = cp.id
      WHERE p.id = poll_id AND cp.user_id = auth.uid()
    )
  );

-- poll_votes 정책
CREATE POLICY "Anyone can read poll_votes" ON poll_votes
  FOR SELECT USING (true);

CREATE POLICY "Logged in users can vote" ON poll_votes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own votes" ON poll_votes
  FOR DELETE USING (auth.uid() = user_id);
