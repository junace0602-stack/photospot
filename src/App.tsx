import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import BottomNav from './components/BottomNav'

// 자주 사용되는 핵심 페이지 (즉시 로드)
import MapPage from './pages/MapPage'
import ListPage from './pages/ListPage'
import MyPage from './pages/MyPage'

// 로딩 폴백 컴포넌트
function PageLoader() {
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

// 나머지 페이지는 lazy loading
const LoginPage = lazy(() => import('./pages/LoginPage'))
const NicknameSetupPage = lazy(() => import('./pages/NicknameSetupPage'))
const AdminPage = lazy(() => import('./pages/AdminPage'))
const SpotPostsPage = lazy(() => import('./pages/SpotPostsPage'))
const PostDetailPage = lazy(() => import('./pages/PostDetailPage'))
const CreatePostPage = lazy(() => import('./pages/CreatePostPage'))
const MyActivityPage = lazy(() => import('./pages/MyActivityPage'))
const EventDetailPage = lazy(() => import('./pages/EventDetailPage'))
const EventCreatePage = lazy(() => import('./pages/EventCreatePage'))
const CommunityPostDetailPage = lazy(() => import('./pages/CommunityPostDetailPage'))
const FeedbackPage = lazy(() => import('./pages/FeedbackPage'))
const BlockedUsersPage = lazy(() => import('./pages/BlockedUsersPage'))
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'))
const TermsPage = lazy(() => import('./pages/TermsPage'))
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'))
const TermsAgreementPage = lazy(() => import('./pages/TermsAgreementPage'))
const UnregisteredSpotPage = lazy(() => import('./pages/UnregisteredSpotPage'))
const InstallPage = lazy(() => import('./pages/InstallPage'))

function AuthRedirect({ children }: { children: React.ReactNode }) {
  const { loggedIn, profile, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen text-sm text-gray-400">
        로딩 중...
      </div>
    )
  }

  const isTermsPage = location.pathname === '/terms-agreement'
  const isNicknamePage = location.pathname === '/nickname-setup'

  // 로그인 됐는데 프로필 없으면 약관 동의로
  if (loggedIn && !profile && !isTermsPage) {
    return <Navigate to="/terms-agreement" replace />
  }

  // 프로필은 있는데 닉네임이 없는 경우 (신규 가입자)
  if (loggedIn && profile && !profile.nickname) {
    // 약관 동의 안 했으면 약관 동의로
    if (!profile.terms_agreed_at && !isTermsPage) {
      return <Navigate to="/terms-agreement" replace />
    }
    // 약관 동의 했으면 닉네임 설정으로
    if (profile.terms_agreed_at && !isNicknamePage) {
      return <Navigate to="/nickname-setup" replace />
    }
  }

  return <>{children}</>
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { role, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen text-sm text-gray-400">
        로딩 중...
      </div>
    )
  }

  const isAdmin = role === 'admin' || role === 'superadmin'
  if (!isAdmin) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}

function AppLayout() {
  const { pathname } = useLocation()
  const hideNav = pathname === '/posts/new' || pathname.endsWith('/posts/new')

  return (
    <div className="flex flex-col h-screen">
      <main className="flex-1 min-h-0">
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<MapPage />} />
            <Route path="/list" element={<ListPage />} />
            <Route path="/mypage" element={<MyPage />} />
            <Route path="/mypage/:type" element={<MyActivityPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/terms-agreement" element={<TermsAgreementPage />} />
            <Route path="/nickname-setup" element={<NicknameSetupPage />} />
            <Route path="/admin" element={<AdminRoute><AdminPage /></AdminRoute>} />
            <Route path="/events/new" element={<EventCreatePage />} />
            <Route path="/events/:eventId" element={<EventDetailPage />} />
            <Route path="/spots/unregistered" element={<UnregisteredSpotPage />} />
            <Route path="/spots/:id" element={<SpotPostsPage />} />
            <Route path="/posts/new" element={<CreatePostPage />} />
            <Route path="/spots/:spotId/posts/new" element={<CreatePostPage />} />
            <Route path="/spots/:spotId/posts/:postId" element={<PostDetailPage />} />
            <Route path="/community/:postId" element={<CommunityPostDetailPage />} />
            <Route path="/feedback" element={<FeedbackPage />} />
            <Route path="/mypage/blocked" element={<BlockedUsersPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/install" element={<InstallPage />} />
          </Routes>
        </Suspense>
      </main>
      {!hideNav && <BottomNav />}
    </div>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <AuthRedirect>
            <AppLayout />
          </AuthRedirect>
        </AuthProvider>
      </BrowserRouter>
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3000,
          success: {
            style: {
              background: '#10B981',
              color: '#fff',
            },
          },
          error: {
            style: {
              background: '#EF4444',
              color: '#fff',
            },
          },
        }}
      />
    </ThemeProvider>
  )
}
