-- EXIF 데이터 컬럼 추가
-- Supabase SQL Editor에서 실행하세요

-- community_posts 테이블에 exif_data 컬럼 추가
ALTER TABLE community_posts
ADD COLUMN IF NOT EXISTS exif_data JSONB;

-- posts 테이블에도 exif_data 컬럼 추가 (출사지 글)
ALTER TABLE posts
ADD COLUMN IF NOT EXISTS exif_data JSONB;

-- 인덱스 (필요시)
-- CREATE INDEX IF NOT EXISTS idx_community_posts_exif ON community_posts USING GIN (exif_data);
