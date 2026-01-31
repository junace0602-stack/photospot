export interface Place {
  id: string
  name: string
  lat: number
  lng: number
  created_at: string
  country?: string
  is_domestic?: boolean
  address?: string
  region?: string  // 시/도 (서울, 부산, 경기 등)
  district?: string  // 구/군/시 (동작구, 성남시 등)
}

export interface ContentBlock {
  type: 'photo' | 'text'
  url?: string
  text?: string
}

export interface Post {
  id: string
  place_id: string
  user_id: string
  author_nickname: string
  title: string
  content_blocks: ContentBlock[]
  thumbnail_url: string | null
  categories: string[]
  time_slots: string[]
  tripod: string | null
  tripod_note: string | null
  equipment_text: string | null
  tip: string | null
  visit_date: string | null
  crowdedness: string | null
  parking: string | null
  parking_note: string | null
  fee_type: string | null
  fee_amount: string | null
  restroom: string | null
  safety: string | null
  reservation: string | null
  youtube_urls: string[] | null
  place_type: string | null  // 자연/바다/도시/실내
  tags: string[] | null  // 야경, 일출/일몰, 건축, 카페, 전통, 인물
  likes_count: number
  comment_count: number
  view_count: number
  is_anonymous: boolean
  is_domestic: boolean
  created_at: string
  exif_data?: import('./exif').ExifData | (import('./exif').ExifData | null)[] | null
  // joined
  places?: Pick<Place, 'name' | 'lat' | 'lng'>
}

export interface Comment {
  id: string
  post_id: string
  user_id: string
  author_nickname: string
  content: string
  is_anonymous: boolean
  created_at: string
}
