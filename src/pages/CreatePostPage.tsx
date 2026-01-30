import { useState, useRef, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, ImagePlus, X, ChevronDown, Loader2, Search, MapPin, Plus, Trophy, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'
import { uploadImageWithThumbnail, IMAGE_ACCEPT } from '../lib/imageUpload'
import { moderateText, checkDuplicatePost } from '../lib/moderation'
import { checkSuspension } from '../lib/penalty'
import { extractExif, type ExifData } from '../lib/exif'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { searchPlacesAutocomplete, getPlaceDetails, type AutocompleteResult } from '../lib/geocode'
import { loadGoogleMaps } from '../lib/googleMaps'
import type { Post } from '../lib/types'

type PhotoBlock = { type: 'photo'; id: string; url: string; thumbnailUrl?: string }
type TextBlock = { type: 'text'; id: string; text: string }
type ContentBlock = PhotoBlock | TextBlock

type BoardType = '출사지' | '일반' | '사진' | '장비'
const BOARD_TYPES: BoardType[] = ['출사지', '일반', '사진', '장비']

let blockId = 0
const newId = () => String(++blockId)

const CATEGORIES = ['자연', '바다', '도시', '건축', '야경', '실내', '감성'] as const
const TIME_SLOTS = ['일출', '오전', '오후', '일몰', '야간'] as const
const TRIPOD_OPTS = ['가능', '불가'] as const
const CROWDEDNESS = ['높음', '보통', '낮음'] as const
const PARKING_OPTS = ['불가', '무료', '유료'] as const
const FEE_TYPE = ['무료', '유료'] as const
const RESTROOM_OPTS = ['있음', '없음', '모름'] as const
const SAFETY_OPTS = ['안전', '주의 필요', '위험'] as const
const RESERVATION_OPTS = ['필수', '권장', '불필요'] as const

function RadioGroup({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: readonly string[]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div>
      <p className="text-sm font-medium text-gray-700 mb-2">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(value === opt ? '' : opt)}
            className={`px-3 py-1.5 rounded-full text-sm ${
              value === opt
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  )
}

function ChipGroup({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string
  options: readonly string[]
  selected: Set<string>
  onToggle: (v: string) => void
}) {
  return (
    <div>
      <p className="text-sm font-medium text-gray-700 mb-2">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => onToggle(opt)}
            className={`px-3 py-1.5 rounded-full text-sm ${
              selected.has(opt)
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function CreatePostPage() {
  const { spotId: paramSpotId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { user, profile } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [submitting, setSubmitting] = useState(false)
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [isQuestion, setIsQuestion] = useState(false)

  // URL 쿼리 파라미터
  const searchParams = new URLSearchParams(location.search)
  const querySpotId = searchParams.get('spotId')
  const queryLat = searchParams.get('lat')
  const queryLng = searchParams.get('lng')
  const queryName = searchParams.get('name')

  // 챌린지 관련
  const challengeIdParam = searchParams.get('challengeId')
  const [challenges, setChallenges] = useState<{ id: string; title: string }[]>([])
  const [selectedChallengeId, setSelectedChallengeId] = useState<string>(challengeIdParam ?? '')

  // 수정 모드
  const editPost = (location.state as { editPost?: Post } | null)?.editPost ?? null
  const isEditMode = !!editPost

  // 게시판 타입
  const initialSpotId = paramSpotId ?? querySpotId ?? ''
  const [boardType, setBoardType] = useState<BoardType>(initialSpotId || queryLat ? '출사지' : challengeIdParam ? '사진' : '출사지')
  const isSpot = boardType === '출사지'

  // 국내/해외 구분
  const [isDomestic, setIsDomestic] = useState(true)

  // 장소 선택 (출사지 전용)
  const [selectedSpotId, setSelectedSpotId] = useState(initialSpotId)
  const [spotName, setSpotName] = useState('장소')

  // 장소 검색
  const [placeQuery, setPlaceQuery] = useState('')
  const [dbResults, setDbResults] = useState<{ id: string; name: string }[]>([])
  const [googleResults, setGoogleResults] = useState<AutocompleteResult[]>([])
  const [showResults, setShowResults] = useState(false)

  // 새 장소 등록
  const [showNewPlace, setShowNewPlace] = useState(false)
  const [newPlaceName, setNewPlaceName] = useState('')
  const [newPlaceLat, setNewPlaceLat] = useState(37.5665)
  const [newPlaceLng, setNewPlaceLng] = useState(126.978)
  const [savingPlace, setSavingPlace] = useState(false)
  const newPlaceMapRef = useRef<HTMLDivElement>(null)

  const spotId = initialSpotId || selectedSpotId

  // URL에서 spotId가 있으면 이름 조회
  useEffect(() => {
    if (!initialSpotId) return
    supabase
      .from('places')
      .select('name')
      .eq('id', initialSpotId)
      .single()
      .then(({ data }) => {
        if (data) setSpotName(data.name)
      })
  }, [initialSpotId])

  // URL에서 미등록 장소 정보가 있으면 자동 등록
  useEffect(() => {
    if (initialSpotId || !queryLat || !queryLng || !queryName) return

    const registerNewPlace = async () => {
      // 동일 이름의 장소가 이미 등록되어 있는지 확인
      const { data: existing } = await supabase
        .from('places')
        .select('id, name')
        .eq('name', queryName)
        .maybeSingle()

      if (existing) {
        setSelectedSpotId(existing.id)
        setSpotName(existing.name)
        return
      }

      // 새 장소 등록
      const { data, error } = await supabase
        .from('places')
        .insert({
          name: queryName,
          lat: parseFloat(queryLat),
          lng: parseFloat(queryLng),
          is_domestic: true,
        })
        .select('id, name')
        .single()

      if (!error && data) {
        setSelectedSpotId(data.id)
        setSpotName(data.name)
        toast.success(`"${data.name}" 장소가 새로 등록되었습니다.`)
      }
    }

    registerNewPlace()
  }, [initialSpotId, queryLat, queryLng, queryName])

  // 진행 중인 챌린지 목록 fetch
  useEffect(() => {
    const now = new Date().toISOString().slice(0, 10)
    supabase
      .from('events')
      .select('id, title, end_date')
      .eq('status', 'approved')
      .gte('end_date', now)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data) setChallenges(data.map((e) => ({ id: e.id, title: e.title })))
      })
  }, [])

  // 장소 검색 (디바운스 300ms): DB + Google Autocomplete 병렬
  useEffect(() => {
    if (initialSpotId || selectedSpotId) return
    const q = placeQuery.trim()
    if (!q) {
      setDbResults([])
      setGoogleResults([])
      setShowResults(false)
      return
    }
    const regionCodes = isDomestic ? ['kr'] : undefined
    const timer = setTimeout(() => {
      Promise.all([
        supabase
          .from('places')
          .select('id, name')
          .ilike('name', `%${q}%`)
          .limit(5)
          .then(({ data }) => data ?? []),
        searchPlacesAutocomplete(q, regionCodes),
      ]).then(([db, google]) => {
        setDbResults(db)
        setGoogleResults(google)
        setShowResults(true)
      })
    }, 300)
    return () => clearTimeout(timer)
  }, [placeQuery, initialSpotId, selectedSpotId, isDomestic])

  // 새 장소 등록 모달 열릴 때 지도 초기화
  useEffect(() => {
    if (!showNewPlace || !newPlaceMapRef.current) return

    let cancelled = false
    ;(async () => {
      await loadGoogleMaps()
      if (cancelled || !newPlaceMapRef.current) return

      const lat = newPlaceLat
      const lng = newPlaceLng
      const map = new google.maps.Map(newPlaceMapRef.current, {
        center: { lat, lng },
        zoom: 14,
        zoomControl: true,
        zoomControlOptions: { position: google.maps.ControlPosition.TOP_RIGHT },
      })
      const marker = new google.maps.Marker({
        position: { lat, lng },
        map,
        draggable: true,
      })

      map.addListener('click', (e: google.maps.MapMouseEvent) => {
        marker.setPosition(e.latLng!)
        setNewPlaceLat(e.latLng!.lat())
        setNewPlaceLng(e.latLng!.lng())
      })
      marker.addListener('dragend', () => {
        const pos = marker.getPosition()!
        setNewPlaceLat(pos.lat())
        setNewPlaceLng(pos.lng())
      })
    })()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showNewPlace])

  const handleSelectDbPlace = (place: { id: string; name: string }) => {
    setSelectedSpotId(place.id)
    setSpotName(place.name)
    setPlaceQuery('')
    setShowResults(false)
  }

  const handleSelectGooglePlace = async (result: AutocompleteResult) => {
    setShowResults(false)
    setPlaceQuery('')

    // 동일 이름의 장소가 이미 등록되어 있는지 확인
    const { data: existing } = await supabase
      .from('places')
      .select('id, name')
      .eq('name', result.name)
      .maybeSingle()

    if (existing) {
      setSelectedSpotId(existing.id)
      setSpotName(existing.name)
      return
    }

    // Google Place Details로 좌표·주소 조회
    const detail = await getPlaceDetails(result.place_id)
    if (!detail) {
      toast.error('장소 정보를 가져올 수 없습니다.')
      return
    }

    // 새 출사지로 등록
    const placeRow: Record<string, unknown> = {
      name: detail.name,
      lat: detail.lat,
      lng: detail.lng,
      is_domestic: isDomestic,
    }
    if (!isDomestic && detail.country) {
      placeRow.country = detail.country
    }

    const { data, error } = await supabase
      .from('places')
      .insert(placeRow)
      .select('id, name')
      .single()

    if (error) {
      toast.error('장소 등록 실패: ' + error.message)
      return
    }

    setSelectedSpotId(data.id)
    setSpotName(data.name)
  }

  const handleClearPlace = () => {
    setSelectedSpotId('')
    setSpotName('장소')
    setPlaceQuery('')
  }

  const handleOpenNewPlace = () => {
    setNewPlaceName(placeQuery.trim())
    setNewPlaceLat(37.5665)
    setNewPlaceLng(126.978)
    setShowResults(false)
    setShowNewPlace(true)
  }

  const handleSaveNewPlace = async () => {
    if (!newPlaceName.trim() || savingPlace) return
    setSavingPlace(true)

    const { data, error } = await supabase
      .from('places')
      .insert({ name: newPlaceName.trim(), lat: newPlaceLat, lng: newPlaceLng, is_domestic: isDomestic })
      .select('id, name')
      .single()

    setSavingPlace(false)

    if (error) {
      toast.error('장소 등록 실패: ' + error.message)
      return
    }

    setSelectedSpotId(data.id)
    setSpotName(data.name)
    setPlaceQuery('')
    setShowNewPlace(false)
  }

  const [title, setTitle] = useState('')

  // Content blocks
  const [blocks, setBlocks] = useState<ContentBlock[]>([
    { type: 'text', id: newId(), text: '' },
  ])
  const [uploadingIds, setUploadingIds] = useState<Set<string>>(new Set())
  const [exifData, setExifData] = useState<ExifData | null>(null)

  // Meta state — 기본 (항상 보임)
  const [categories, setCategories] = useState<Set<string>>(new Set())
  const [timeSlots, setTimeSlots] = useState<Set<string>>(new Set())
  const [tripod, setTripod] = useState('')
  const [tripodNote, setTripodNote] = useState('')
  const [tip, setTip] = useState('')

  // Meta state — 상세 (펼치기/접기)
  const [detailOpen, setDetailOpen] = useState(false)
  const [crowdedness, setCrowdedness] = useState('')
  const [parking, setParking] = useState('')
  const [parkingNote, setParkingNote] = useState('')
  const [feeType, setFeeType] = useState('')
  const [feeAmount, setFeeAmount] = useState('')
  const [restroom, setRestroom] = useState('')
  const [safety, setSafety] = useState('')
  const [reservation, setReservation] = useState('')

  // 장비 글쓰기 전용
  const [cameraModel, setCameraModel] = useState('')
  const [lensModel, setLensModel] = useState('')
  const [cameraSuggestions, setCameraSuggestions] = useState<string[]>([])
  const [lensSuggestions, setLensSuggestions] = useState<string[]>([])
  const [showCameraSuggestions, setShowCameraSuggestions] = useState(false)
  const [showLensSuggestions, setShowLensSuggestions] = useState(false)

  // 수정 모드 초기화
  useEffect(() => {
    if (!editPost) return
    setTitle(editPost.title)
    // content_blocks → editor blocks
    const editorBlocks: ContentBlock[] = editPost.content_blocks.map((b) => {
      if (b.type === 'photo') return { type: 'photo' as const, id: newId(), url: b.url! }
      return { type: 'text' as const, id: newId(), text: b.text ?? '' }
    })
    if (editorBlocks.length === 0) editorBlocks.push({ type: 'text', id: newId(), text: '' })
    setBlocks(editorBlocks)
    // meta — 기본
    if (editPost.categories.length) setCategories(new Set(editPost.categories))
    if (editPost.time_slots.length) setTimeSlots(new Set(editPost.time_slots))
    if (editPost.tripod) setTripod(editPost.tripod)
    if (editPost.tripod_note) setTripodNote(editPost.tripod_note)
    if (editPost.tip) setTip(editPost.tip)
    // meta — 상세
    if (editPost.crowdedness) setCrowdedness(editPost.crowdedness)
    if (editPost.parking) setParking(editPost.parking)
    if (editPost.parking_note) setParkingNote(editPost.parking_note)
    if (editPost.fee_type) setFeeType(editPost.fee_type)
    if (editPost.fee_amount) setFeeAmount(editPost.fee_amount)
    if (editPost.restroom) setRestroom(editPost.restroom)
    if (editPost.safety) setSafety(editPost.safety)
    if (editPost.reservation) setReservation(editPost.reservation)
    setIsAnonymous(editPost.is_anonymous ?? false)
    setIsDomestic(editPost.is_domestic ?? true)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 카메라 자동완성
  useEffect(() => {
    if (boardType !== '장비' || !cameraModel.trim()) {
      setCameraSuggestions([])
      return
    }
    const q = cameraModel.trim().toLowerCase()
    const timer = setTimeout(async () => {
      const [communityRes, postsRes] = await Promise.all([
        supabase
          .from('community_posts')
          .select('exif_data, camera_model')
          .limit(300),
        supabase
          .from('posts')
          .select('exif_data')
          .not('exif_data', 'is', null)
          .limit(300),
      ])

      const cameras = new Set<string>()
      ;(communityRes.data ?? []).forEach((row) => {
        const exifCamera = (row.exif_data as { camera?: string } | null)?.camera
        if (exifCamera && exifCamera.toLowerCase().includes(q)) cameras.add(exifCamera)
        const manualCamera = row.camera_model as string | null
        if (manualCamera && manualCamera.toLowerCase().includes(q)) cameras.add(manualCamera)
      })
      ;(postsRes.data ?? []).forEach((row) => {
        const camera = (row.exif_data as { camera?: string })?.camera
        if (camera && camera.toLowerCase().includes(q)) cameras.add(camera)
      })
      setCameraSuggestions([...cameras].slice(0, 8))
      setShowCameraSuggestions(cameras.size > 0)
    }, 300)
    return () => clearTimeout(timer)
  }, [boardType, cameraModel])

  // 렌즈 자동완성
  useEffect(() => {
    if (boardType !== '장비' || !lensModel.trim()) {
      setLensSuggestions([])
      return
    }
    const q = lensModel.trim().toLowerCase()
    const timer = setTimeout(async () => {
      const [communityRes, postsRes] = await Promise.all([
        supabase
          .from('community_posts')
          .select('exif_data, lens_model')
          .limit(300),
        supabase
          .from('posts')
          .select('exif_data')
          .not('exif_data', 'is', null)
          .limit(300),
      ])

      const lenses = new Set<string>()
      ;(communityRes.data ?? []).forEach((row) => {
        const exifLens = (row.exif_data as { lens?: string } | null)?.lens
        if (exifLens && exifLens.toLowerCase().includes(q)) lenses.add(exifLens)
        const manualLens = row.lens_model as string | null
        if (manualLens && manualLens.toLowerCase().includes(q)) lenses.add(manualLens)
      })
      ;(postsRes.data ?? []).forEach((row) => {
        const lens = (row.exif_data as { lens?: string })?.lens
        if (lens && lens.toLowerCase().includes(q)) lenses.add(lens)
      })
      setLensSuggestions([...lenses].slice(0, 8))
      setShowLensSuggestions(lenses.size > 0)
    }, 300)
    return () => clearTimeout(timer)
  }, [boardType, lensModel])

  const toggleSet = (set: Set<string>, value: string) => {
    const next = new Set(set)
    if (next.has(value)) next.delete(value)
    else next.add(value)
    return next
  }

  const hasPhotos = blocks.some((b) => b.type === 'photo')
  const isUploading = uploadingIds.size > 0
  const hasTitle = title.trim().length > 0

  // 사진 필수 여부: 출사지 또는 사진 탭
  const requiresPhoto = isSpot || boardType === '사진'

  const canSubmit = isSpot
    ? !!spotId && hasTitle && !isUploading && !submitting
    : hasTitle && !isUploading && !submitting

  const handleAddPhotos = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    const entries: { file: File; id: string }[] = []
    const newBlocks: ContentBlock[] = []

    Array.from(files).forEach((file) => {
      const id = newId()
      entries.push({ file, id })
      newBlocks.push({
        type: 'photo',
        id,
        url: URL.createObjectURL(file),
      })
      newBlocks.push({ type: 'text', id: newId(), text: '' })
    })

    setBlocks((prev) => {
      const last = prev[prev.length - 1]
      if (last.type === 'text' && !last.text.trim()) {
        return [...prev.slice(0, -1), ...newBlocks]
      }
      return [...prev, ...newBlocks]
    })

    const ids = new Set(entries.map((en) => en.id))
    setUploadingIds((prev) => new Set([...prev, ...ids]))

    // 첫 번째 사진의 EXIF 추출 (아직 없을 때만)
    const firstFile = entries[0]?.file
    if (firstFile && !exifData) {
      extractExif(firstFile).then((data) => {
        if (data) setExifData(data)
      })
    }

    entries.forEach(({ file, id }) => {
      uploadImageWithThumbnail(file)
        .then((result) => {
          setBlocks((prev) =>
            prev.map((b) => {
              if (b.id === id && b.type === 'photo') {
                URL.revokeObjectURL(b.url)
                return { ...b, url: result.url, thumbnailUrl: result.thumbnailUrl }
              }
              return b
            }),
          )
        })
        .catch((err) => {
          toast.error(err instanceof Error ? err.message : '이미지 업로드에 실패했습니다.')
          removePhoto(id)
        })
        .finally(() => {
          setUploadingIds((prev) => {
            const next = new Set(prev)
            next.delete(id)
            return next
          })
        })
    })

    e.target.value = ''
  }

  const removePhoto = (id: string) => {
    setBlocks((prev) => {
      const idx = prev.findIndex((b) => b.id === id)
      if (idx === -1) return prev
      const next = [...prev]
      next.splice(idx, 1)
      if (
        idx > 0 &&
        idx < next.length &&
        next[idx - 1].type === 'text' &&
        next[idx].type === 'text'
      ) {
        const merged: TextBlock = {
          type: 'text',
          id: next[idx - 1].id,
          text:
            (next[idx - 1] as TextBlock).text +
            (next[idx] as TextBlock).text,
        }
        next.splice(idx - 1, 2, merged)
      }
      if (next.length === 0) {
        return [{ type: 'text', id: newId(), text: '' }]
      }
      return next
    })
  }

  const updateText = (id: string, text: string) => {
    setBlocks((prev) =>
      prev.map((b) => (b.id === id ? { ...b, text } : b)),
    )
  }

  const handleSubmit = async () => {
    if (!canSubmit || !user || submitting) return

    // 사진 필수 체크 (출사지/사진 탭)
    if (requiresPhoto && !hasPhotos) {
      toast.error('사진을 1장 이상 추가해주세요')
      return
    }

    setSubmitting(true)

    try {
      // 정지 상태 체크
      const suspension = await checkSuspension(user.id)
      if (suspension.isSuspended) {
        toast.error(suspension.message ?? '계정이 정지되었습니다.')
        return
      }

      // 텍스트 검열
      const allText = blocks
        .filter((b) => b.type === 'text')
        .map((b) => (b as { text: string }).text)
        .join(' ')
      const textToCheck = `${title} ${allText}`
      const modResult = await moderateText(textToCheck)
      if (modResult.blocked) {
        toast.error(modResult.message ?? '부적절한 내용입니다.')
        return
      }

      // 중복 글 체크 (수정 모드가 아닐 때만)
      if (!isEditMode) {
        const dupResult = await checkDuplicatePost(user.id, title, allText)
        if (dupResult.blocked) {
          toast.error(dupResult.message ?? '중복된 내용입니다.')
          return
        }
      }

      if (isSpot) {
        // 출사지 → posts 테이블
        const contentBlocks = blocks
          .map((b) => {
            if (b.type === 'photo') return { type: 'photo' as const, url: (b as PhotoBlock).url }
            return { type: 'text' as const, text: (b as TextBlock).text }
          })
          .filter((b) => b.type === 'photo' || (b.type === 'text' && b.text?.trim()))

        const firstPhoto = blocks.find((b) => b.type === 'photo') as PhotoBlock | undefined

        const postData = {
          title: title.trim(),
          content_blocks: contentBlocks,
          thumbnail_url: firstPhoto?.thumbnailUrl ?? firstPhoto?.url ?? null,
          categories: [...categories],
          time_slots: [...timeSlots],
          tripod: tripod || null,
          tripod_note: (tripod === '기타' && tripodNote.trim()) ? tripodNote.trim() : null,
          tip: tip.trim() || null,
          exif_data: exifData,
          crowdedness: crowdedness || null,
          parking: parking || null,
          parking_note: (parking === '기타' && parkingNote.trim()) ? parkingNote.trim() : null,
          fee_type: feeType || null,
          fee_amount: (feeType === '유료' && feeAmount.trim()) ? feeAmount.trim() : null,
          restroom: isDomestic ? (restroom || null) : null,
          safety: !isDomestic ? (safety || null) : null,
          reservation: !isDomestic ? (reservation || null) : null,
          is_anonymous: isAnonymous,
          is_domestic: isDomestic,
        }

        let error
        let newPostId: string | null = null
        if (isEditMode && editPost) {
          ;({ error } = await supabase.from('posts').update(postData).eq('id', editPost.id))
        } else {
          const insertRes = await supabase.from('posts').insert({
            place_id: spotId,
            user_id: user.id,
            author_nickname: profile?.nickname ?? '익명',
            ...postData,
          }).select('id').single()
          error = insertRes.error
          newPostId = insertRes.data?.id ?? null
        }

        if (error) {
          toast.error('글 저장에 실패했습니다: ' + error.message)
          return
        }

        // 새 글 작성 시 상세 페이지로 이동, 수정 시 뒤로가기
        if (isEditMode) {
          navigate(-1 as any)
        } else if (newPostId) {
          navigate(`/spots/${spotId}/posts/${newPostId}`, { replace: true })
        } else {
          navigate(`/spots/${spotId}`, { replace: true })
        }
      } else {
        // 일반/사진/장비 → community_posts 테이블
        const textContent = blocks
          .filter((b): b is TextBlock => b.type === 'text')
          .map((b) => b.text)
          .join('\n')
          .trim()

        const photoBlocks = blocks.filter((b): b is PhotoBlock => b.type === 'photo')
        const imageUrls = photoBlocks.map((b) => b.url)

        const firstPhoto = photoBlocks[0] ?? null

        // 질문글은 제목 앞에 [질문] 태그 추가
        const finalTitle = isQuestion ? `[질문] ${title.trim()}` : title.trim()

        const row: Record<string, unknown> = {
          user_id: user.id,
          author_nickname: profile?.nickname ?? '익명',
          section: boardType,
          title: finalTitle,
          content: textContent,
          thumbnail_url: firstPhoto?.thumbnailUrl ?? firstPhoto?.url ?? null,
          image_urls: imageUrls,
          is_anonymous: isAnonymous,
          is_question: isQuestion,
          exif_data: exifData,
        }
        // event_id 컬럼이 DB에 있을 때만 포함
        if (boardType === '사진' && selectedChallengeId) {
          row.event_id = selectedChallengeId
        }
        // 장비 글쓰기: camera_model, lens_model 추가
        if (boardType === '장비') {
          if (cameraModel.trim()) row.camera_model = cameraModel.trim()
          if (lensModel.trim()) row.lens_model = lensModel.trim()
        }

        const { error } = await supabase.from('community_posts').insert(row)

        if (error) {
          toast.error('글 저장에 실패했습니다: ' + error.message)
          return
        }

        // 챌린지 참여 시 entries_count 증가
        if (boardType === '사진' && selectedChallengeId) {
          await supabase.rpc('increment_field', {
            table_name: 'events',
            row_id: selectedChallengeId,
            field_name: 'entries_count',
            amount: 1,
          }).then(({ error: rpcError }) => {
            if (rpcError) {
              return supabase
                .from('events')
                .select('entries_count')
                .eq('id', selectedChallengeId)
                .single()
                .then(({ data }) => {
                  if (data) {
                    return supabase
                      .from('events')
                      .update({ entries_count: (data.entries_count ?? 0) + 1 })
                      .eq('id', selectedChallengeId)
                  }
                })
            }
          })
        }

        navigate(`/list?tab=${encodeURIComponent(boardType)}`, { replace: true })
      }
    } catch {
      toast.error('글 저장 중 오류가 발생했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <header className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-6 h-6 text-gray-700" />
          </button>
          <h1 className="text-lg font-bold">{isEditMode ? '글 수정' : '글쓰기'}</h1>
        </div>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className={`px-4 py-1.5 rounded-lg text-sm font-semibold ${
            canSubmit
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-400'
          }`}
        >
          {submitting ? '저장 중...' : isUploading ? '업로드 중...' : isEditMode ? '수정' : '등록'}
        </button>
      </header>

      {/* 질문글 경고 배너 */}
      {isQuestion && (
        <div className="px-4 py-2 bg-orange-50 border-b border-orange-100">
          <div className="flex items-center gap-2 text-orange-700">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <p className="text-xs font-medium">
              질문글은 삭제나 수정이 불가능합니다
            </p>
          </div>
        </div>
      )}

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        {/* 게시판 타입 선택 */}
        {!paramSpotId && !isEditMode && (
          <div className="flex gap-2 px-4 py-3 bg-gray-50 border-b border-gray-200">
            {BOARD_TYPES.map((bt) => (
              <button
                key={bt}
                type="button"
                onClick={() => setBoardType(bt)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium ${
                  boardType === bt
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-600 border border-gray-300'
                }`}
              >
                {bt}
              </button>
            ))}
          </div>
        )}

        {/* 챌린지 선택 (사진 전용) */}
        {boardType === '사진' && !isEditMode && challenges.length > 0 && (
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-blue-500 shrink-0" />
              <select
                value={selectedChallengeId}
                onChange={(e) => setSelectedChallengeId(e.target.value)}
                className="flex-1 text-sm bg-white border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-blue-400"
              >
                <option value="">챌린지 없이 작성</option>
                {challenges.map((c) => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* 장비 선택 (장비 전용) */}
        {boardType === '장비' && (
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 space-y-3">
            {/* 카메라 */}
            <div className="relative">
              <label className="text-xs font-medium text-gray-500 mb-1 block">카메라 (선택)</label>
              <input
                type="text"
                value={cameraModel}
                onChange={(e) => setCameraModel(e.target.value)}
                onFocus={() => cameraSuggestions.length > 0 && setShowCameraSuggestions(true)}
                onBlur={() => setTimeout(() => setShowCameraSuggestions(false), 150)}
                placeholder="예: Sony A7IV, Canon R5"
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm outline-none focus:border-blue-400"
              />
              {showCameraSuggestions && cameraSuggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-40 overflow-y-auto">
                  {cameraSuggestions.map((cam) => (
                    <button
                      key={cam}
                      type="button"
                      onMouseDown={() => {
                        setCameraModel(cam)
                        setShowCameraSuggestions(false)
                      }}
                      className="w-full px-3 py-2 text-left text-sm text-gray-800 hover:bg-gray-50 border-b border-gray-100"
                    >
                      {cam}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 렌즈 */}
            <div className="relative">
              <label className="text-xs font-medium text-gray-500 mb-1 block">렌즈 (선택)</label>
              <input
                type="text"
                value={lensModel}
                onChange={(e) => setLensModel(e.target.value)}
                onFocus={() => lensSuggestions.length > 0 && setShowLensSuggestions(true)}
                onBlur={() => setTimeout(() => setShowLensSuggestions(false), 150)}
                placeholder="예: 24-70mm f/2.8, 85mm f/1.4"
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm outline-none focus:border-blue-400"
              />
              {showLensSuggestions && lensSuggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-40 overflow-y-auto">
                  {lensSuggestions.map((lens) => (
                    <button
                      key={lens}
                      type="button"
                      onMouseDown={() => {
                        setLensModel(lens)
                        setShowLensSuggestions(false)
                      }}
                      className="w-full px-3 py-2 text-left text-sm text-gray-800 hover:bg-gray-50 border-b border-gray-100"
                    >
                      {lens}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 국내/해외 선택 (출사지 전용) */}
        {isSpot && !initialSpotId && !selectedSpotId && !isEditMode && (
          <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border-b border-gray-200">
            <span className="text-sm text-gray-500 mr-1">지역</span>
            {(['국내', '해외'] as const).map((label) => {
              const active = label === '국내' ? isDomestic : !isDomestic
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => {
                    const next = label === '국내'
                    if (next === isDomestic) return
                    setIsDomestic(next)
                    setSelectedSpotId('')
                    setSpotName('장소')
                    setPlaceQuery('')
                    setShowResults(false)
                  }}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium ${
                    active
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-600 border border-gray-300'
                  }`}
                >
                  {label}
                </button>
              )
            })}
          </div>
        )}

        {/* 장소 선택 (출사지 전용) */}
        {isSpot && (
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            {(initialSpotId || selectedSpotId) ? (
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-blue-600 shrink-0" />
                <span className="text-sm font-semibold text-gray-800">{spotName}</span>
                {/* URL에서 온 장소가 아닌 경우에만 X 버튼 표시 */}
                {!initialSpotId && selectedSpotId && (
                  <button
                    type="button"
                    onClick={handleClearPlace}
                    className="ml-auto p-0.5 text-gray-400"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ) : (
              <div className="relative">
                <div className="flex items-center gap-2">
                  <Search className="w-4 h-4 text-gray-400 shrink-0" />
                  <input
                    type="text"
                    value={placeQuery}
                    onChange={(e) => setPlaceQuery(e.target.value)}
                    placeholder="장소명을 검색하세요"
                    className="flex-1 text-sm bg-transparent outline-none placeholder:text-gray-400"
                  />
                </div>
                {showResults && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-64 overflow-y-auto">
                    {dbResults.length > 0 && (
                      <>
                        <p className="px-3 py-1.5 text-xs text-gray-400 bg-gray-50">
                          기존 출사지
                        </p>
                        {dbResults.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => handleSelectDbPlace(p)}
                            className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-sm text-gray-800 hover:bg-gray-50 border-b border-gray-100"
                          >
                            <MapPin className="w-4 h-4 text-blue-500 shrink-0" />
                            {p.name}
                          </button>
                        ))}
                      </>
                    )}

                    {googleResults.length > 0 && (
                      <>
                        <p className="px-3 py-1.5 text-xs text-gray-400 bg-gray-50">
                          구글맵 검색 결과
                        </p>
                        {googleResults.map((r) => (
                          <button
                            key={r.place_id}
                            type="button"
                            onClick={() => handleSelectGooglePlace(r)}
                            className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-gray-50 border-b border-gray-100"
                          >
                            <Search className="w-4 h-4 text-gray-400 shrink-0" />
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-800">{r.name}</p>
                              {r.address && (
                                <p className="text-xs text-gray-400 mt-0.5 truncate">{r.address}</p>
                              )}
                            </div>
                          </button>
                        ))}
                      </>
                    )}

                    <button
                      type="button"
                      onClick={handleOpenNewPlace}
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-sm text-blue-600 font-medium hover:bg-blue-50"
                    >
                      <Plus className="w-4 h-4 shrink-0" />
                      새 장소 등록{placeQuery.trim() ? `: "${placeQuery.trim()}"` : ''}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Title */}
        <div className="px-4 pt-4 pb-2 border-b border-gray-100">
          <input
            type="text"
            placeholder="제목을 입력하세요"
            maxLength={100}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full text-base font-semibold text-gray-900 outline-none placeholder:text-gray-300"
          />
        </div>

        {/* Content editor */}
        <div className="px-4 py-4">
          {blocks.map((block) =>
            block.type === 'photo' ? (
              <div key={block.id} className="relative mb-3">
                <img
                  src={block.url}
                  alt="첨부 사진"
                  className={`w-full rounded-lg ${uploadingIds.has(block.id) ? 'opacity-50' : ''}`}
                />
                {uploadingIds.has(block.id) && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="flex items-center gap-2 bg-black/60 text-white text-xs px-3 py-1.5 rounded-full">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      업로드 중...
                    </div>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => removePhoto(block.id)}
                  className="absolute top-2 right-2 w-7 h-7 bg-black/60 rounded-full flex items-center justify-center"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>
            ) : (
              <textarea
                key={block.id}
                value={block.text}
                onChange={(e) => updateText(block.id, e.target.value)}
                placeholder={!isEditMode ? `내용을 입력하세요

📋 커뮤니티 가이드
✓ 출사지 정보 공유 및 리뷰
✓ 촬영한 사진 공유
✓ 카메라/장비 관련 질문 및 팁
✓ 출사 동행 모집

✗ 광고/홍보, 스팸/도배
✗ 정치, 일베/극단적 표현
✗ 지역/인종 비하, 고인 모독` : '내용을 입력하세요'}
                className="w-full min-h-[200px] text-sm text-gray-800 leading-relaxed outline-none resize-none mb-3 placeholder:text-gray-400"
              />
            ),
          )}
        </div>

        {/* Meta section (출사지 전용) */}
        {isSpot && (
          <div className="border-t border-gray-200">
            {/* ── 기본 정보 (항상 보임) ── */}
            <div className="px-4 py-4 space-y-5">
              <ChipGroup
                label="카테고리 태그 (복수 선택)"
                options={CATEGORIES}
                selected={categories}
                onToggle={(v) => setCategories(toggleSet(categories, v))}
              />
              <ChipGroup
                label="추천 시간대 (복수 선택)"
                options={TIME_SLOTS}
                selected={timeSlots}
                onToggle={(v) => setTimeSlots(toggleSet(timeSlots, v))}
              />

              {/* 삼각대 사용 */}
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">삼각대 사용</p>
                <div className="flex flex-wrap gap-2">
                  {([...TRIPOD_OPTS, '기타'] as const).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => {
                        setTripod(tripod === opt ? '' : opt)
                        if (opt !== '기타') setTripodNote('')
                      }}
                      className={`px-3 py-1.5 rounded-full text-sm ${
                        tripod === opt ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
                {tripod === '기타' && (
                  <input
                    type="text"
                    placeholder="삼각대 관련 메모"
                    value={tripodNote}
                    onChange={(e) => setTripodNote(e.target.value)}
                    className="mt-2 w-full px-3 py-2 bg-gray-100 rounded-lg text-sm outline-none"
                  />
                )}
              </div>

              {/* 나만의 팁 */}
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">나만의 팁</p>
                <textarea
                  placeholder="촬영 팁이나 유의사항을 자유롭게 적어주세요"
                  value={tip}
                  onChange={(e) => setTip(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-100 rounded-lg text-sm outline-none resize-none min-h-[72px]"
                />
              </div>
            </div>

            {/* ── 상세한 촬영 팁 (펼치기/접기) ── */}
            <div className="border-t border-gray-200">
              <button
                type="button"
                onClick={() => setDetailOpen((v) => !v)}
                className="w-full flex items-center justify-between px-4 py-3"
              >
                <span className="text-sm font-semibold text-gray-700">
                  상세한 촬영 팁
                </span>
                <ChevronDown
                  className={`w-5 h-5 text-gray-400 transition-transform ${
                    detailOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {detailOpen && (
                <div className="px-4 pb-6 space-y-5">
                  {/* 혼잡도 */}
                  <RadioGroup label="혼잡도" options={CROWDEDNESS} value={crowdedness} onChange={setCrowdedness} />

                  {/* 국내 전용: 주차 */}
                  {isDomestic && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">주차</p>
                      <div className="flex flex-wrap gap-2">
                        {([...PARKING_OPTS, '기타'] as const).map((opt) => (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => {
                              setParking(parking === opt ? '' : opt)
                              if (opt !== '기타') setParkingNote('')
                            }}
                            className={`px-3 py-1.5 rounded-full text-sm ${
                              parking === opt ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                      {parking === '기타' && (
                        <input
                          type="text"
                          placeholder="주차 관련 메모"
                          value={parkingNote}
                          onChange={(e) => setParkingNote(e.target.value)}
                          className="mt-2 w-full px-3 py-2 bg-gray-100 rounded-lg text-sm outline-none"
                        />
                      )}
                    </div>
                  )}

                  {/* 입장료 (공통) */}
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">입장료</p>
                    <div className="flex flex-wrap gap-2">
                      {FEE_TYPE.map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => {
                            setFeeType(feeType === opt ? '' : opt)
                            if (opt === '무료') setFeeAmount('')
                          }}
                          className={`px-3 py-1.5 rounded-full text-sm ${
                            feeType === opt ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                    {feeType === '유료' && (
                      <input
                        type="text"
                        placeholder="금액 입력 (예: 5,000원)"
                        value={feeAmount}
                        onChange={(e) => setFeeAmount(e.target.value)}
                        className="mt-2 w-full px-3 py-2 bg-gray-100 rounded-lg text-sm outline-none"
                      />
                    )}
                  </div>

                  {/* 국내 전용: 화장실 */}
                  {isDomestic && (
                    <RadioGroup label="화장실" options={RESTROOM_OPTS} value={restroom} onChange={setRestroom} />
                  )}

                  {/* 해외 전용: 치안, 예약 */}
                  {!isDomestic && (
                    <>
                      <RadioGroup label="치안" options={SAFETY_OPTS} value={safety} onChange={setSafety} />
                      <RadioGroup label="예약 필수" options={RESERVATION_OPTS} value={reservation} onChange={setReservation} />
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bottom toolbar */}
      <div className="shrink-0 flex items-center px-4 py-3 border-t border-gray-200 bg-white">
        <input
          ref={fileInputRef}
          type="file"
          accept={IMAGE_ACCEPT}
          multiple
          onChange={handleAddPhotos}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1.5 text-sm text-gray-600"
        >
          <ImagePlus className="w-5 h-5" />
          사진 추가
        </button>
        <label className="ml-4 flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={isAnonymous}
            onChange={(e) => setIsAnonymous(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          익명
        </label>
        {!isSpot && (
          <label className="ml-3 flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isQuestion}
              onChange={(e) => setIsQuestion(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-orange-500 focus:ring-orange-400"
            />
            질문
          </label>
        )}
      </div>

      {/* 새 장소 등록 모달 */}
      {showNewPlace && (
        <div className="fixed inset-0 z-50 flex flex-col bg-white">
          <header className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setShowNewPlace(false)}>
                <ArrowLeft className="w-6 h-6 text-gray-700" />
              </button>
              <h1 className="text-lg font-bold">새 장소 등록</h1>
            </div>
            <button
              type="button"
              onClick={handleSaveNewPlace}
              disabled={!newPlaceName.trim() || savingPlace}
              className={`px-4 py-1.5 rounded-lg text-sm font-semibold ${
                newPlaceName.trim() && !savingPlace
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-400'
              }`}
            >
              {savingPlace ? '등록 중...' : '등록'}
            </button>
          </header>

          <div className="flex-1 overflow-y-auto">
            <div className="px-4 py-4 space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1.5">장소명</p>
                <input
                  type="text"
                  value={newPlaceName}
                  onChange={(e) => setNewPlaceName(e.target.value)}
                  placeholder="장소 이름을 입력하세요"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <p className="text-sm font-medium text-gray-700 mb-1.5">
                  위치 선택 <span className="font-normal text-gray-400">지도를 터치하거나 마커를 드래그하세요</span>
                </p>
                <div
                  ref={newPlaceMapRef}
                  className="w-full h-72 rounded-lg border border-gray-200"
                />
                <p className="mt-1.5 text-xs text-gray-400">
                  위도 {newPlaceLat.toFixed(5)}, 경도 {newPlaceLng.toFixed(5)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
