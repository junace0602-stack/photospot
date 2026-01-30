-- 성능 최적화를 위한 인덱스 추가
-- Supabase SQL Editor에서 실행하세요

-- ============================================
-- community_posts 테이블 인덱스
-- ============================================

-- 최신순 정렬 (가장 자주 사용)
CREATE INDEX IF NOT EXISTS idx_community_posts_created_at
ON community_posts (created_at DESC);

-- 섹션별 최신순 (섹션 필터 + 정렬)
CREATE INDEX IF NOT EXISTS idx_community_posts_section_created
ON community_posts (section, created_at DESC);

-- 사용자별 글 조회 (마이페이지)
CREATE INDEX IF NOT EXISTS idx_community_posts_user_id
ON community_posts (user_id, created_at DESC);

-- 이벤트별 글 조회 (챌린지 페이지)
CREATE INDEX IF NOT EXISTS idx_community_posts_event_id
ON community_posts (event_id) WHERE event_id IS NOT NULL;

-- 인기글 필터 (likes_count >= 3)
CREATE INDEX IF NOT EXISTS idx_community_posts_likes
ON community_posts (likes_count DESC) WHERE likes_count >= 3;

-- ============================================
-- posts 테이블 인덱스 (출사지 글)
-- ============================================

-- 최신순 정렬
CREATE INDEX IF NOT EXISTS idx_posts_created_at
ON posts (created_at DESC);

-- 출사지별 글 조회
CREATE INDEX IF NOT EXISTS idx_posts_place_id
ON posts (place_id, created_at DESC);

-- 사용자별 글 조회
CREATE INDEX IF NOT EXISTS idx_posts_user_id
ON posts (user_id, created_at DESC);

-- 인기순 정렬
CREATE INDEX IF NOT EXISTS idx_posts_likes
ON posts (likes_count DESC);

-- ============================================
-- places 테이블 인덱스 (출사지)
-- ============================================

-- 지역별 조회 (is_domestic)
CREATE INDEX IF NOT EXISTS idx_places_domestic
ON places (is_domestic);

-- 나라별 조회
CREATE INDEX IF NOT EXISTS idx_places_country
ON places (country) WHERE country IS NOT NULL;

-- 지리적 인덱스 (PostGIS 확장 필요 시)
-- CREATE INDEX IF NOT EXISTS idx_places_location
-- ON places USING GIST (ST_MakePoint(lng, lat));

-- ============================================
-- comments 테이블 인덱스
-- ============================================

CREATE INDEX IF NOT EXISTS idx_comments_post_id
ON comments (post_id, created_at ASC);

-- ============================================
-- community_comments 테이블 인덱스
-- ============================================

CREATE INDEX IF NOT EXISTS idx_community_comments_post_id
ON community_comments (community_post_id, created_at ASC);

-- ============================================
-- likes 테이블 인덱스
-- ============================================

CREATE INDEX IF NOT EXISTS idx_likes_post_id
ON likes (post_id);

CREATE INDEX IF NOT EXISTS idx_likes_user_post
ON likes (user_id, post_id);

-- ============================================
-- community_likes 테이블 인덱스
-- ============================================

CREATE INDEX IF NOT EXISTS idx_community_likes_post_id
ON community_likes (community_post_id);

CREATE INDEX IF NOT EXISTS idx_community_likes_user_post
ON community_likes (user_id, community_post_id);

-- ============================================
-- scraps 테이블 인덱스
-- ============================================

CREATE INDEX IF NOT EXISTS idx_scraps_user_id
ON scraps (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_scraps_post_id
ON scraps (post_id);

-- ============================================
-- notifications 테이블 인덱스
-- ============================================

CREATE INDEX IF NOT EXISTS idx_notifications_user_id
ON notifications (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_unread
ON notifications (user_id, is_read) WHERE is_read = false;

-- ============================================
-- user_penalties 테이블 인덱스
-- ============================================

CREATE INDEX IF NOT EXISTS idx_user_penalties_user_id
ON user_penalties (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_penalties_active
ON user_penalties (user_id, expires_at)
WHERE expires_at IS NULL OR expires_at > NOW();
