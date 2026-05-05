import { BrowserRouter, Routes, Route } from 'react-router-dom'
import WelcomePage from './pages/WelcomePage'
import OnboardingPage from './pages/OnboardingPage'
import WaitingPage from './pages/WaitingPage'
import DashboardPage from './pages/DashboardPage'
import LogPage from './pages/LogPage'
import FeedPage from './pages/FeedPage'
import SprintRecordPage from './pages/SprintRecordPage'
import SprintFullLogPage from './pages/SprintFullLogPage'
import ProfilePage from './pages/ProfilePage'
import AuthPage from './pages/AuthPage'
import ProtectedRoute from './components/ProtectedRoute'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<WelcomePage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="/log" element={<ProtectedRoute><LogPage /></ProtectedRoute>} />
        <Route path="/feed" element={<ProtectedRoute><FeedPage /></ProtectedRoute>} />
        <Route path="/waiting" element={<ProtectedRoute><WaitingPage /></ProtectedRoute>} />
        <Route path="/record/:id" element={<ProtectedRoute><SprintRecordPage /></ProtectedRoute>} />
        <Route path="/record/:id/full" element={<ProtectedRoute><SprintFullLogPage /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
