import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import BottomNav from './components/BottomNav'
import MapPage from './pages/MapPage'
import ListPage from './pages/ListPage'
import MyPage from './pages/MyPage'
import LoginPage from './pages/LoginPage'
import NicknameSetupPage from './pages/NicknameSetupPage'
import AdminPage from './pages/AdminPage'
import SpotPostsPage from './pages/SpotPostsPage'
import PostDetailPage from './pages/PostDetailPage'
import CreatePostPage from './pages/CreatePostPage'
import MyActivityPage from './pages/MyActivityPage'
import EventDetailPage from './pages/EventDetailPage'
import EventCreatePage from './pages/EventCreatePage'
import CommunityPostDetailPage from './pages/CommunityPostDetailPage'
import FeedbackPage from './pages/FeedbackPage'
import BlockedUsersPage from './pages/BlockedUsersPage'
import NotificationsPage from './pages/NotificationsPage'
import TermsPage from './pages/TermsPage'
import PrivacyPage from './pages/PrivacyPage'
import TermsAgreementPage from './pages/TermsAgreementPage'

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
        </Routes>
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
