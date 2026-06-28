import { Routes, Route, useLocation } from 'react-router-dom'
import { Toaster } from 'sonner'
import Home from './pages/Home'
import WaitingRoom from './pages/WaitingRoom'
import Room from './pages/Room'
import Docs from './pages/Docs'
import Dashboard from './pages/Dashboard'
import { MarketingLayout } from './components/MarketingLayout'
import { RoomLayout } from './components/RoomLayout'
import { AnimatePresence } from 'framer-motion'
import { AuthSync } from './components/AuthSync'
import { FriendsSidebar } from './components/FriendsSidebar'

function App() {
  const location = useLocation()

  return (
    <div className="min-h-screen font-sans selection:bg-teal-500/30 transition-colors duration-300">
      <AuthSync />
      <FriendsSidebar />
      <Toaster theme="dark" position="bottom-right" richColors />
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          
          {/* Pages WITH the Navigation Header */}
          <Route element={<MarketingLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/join/:roomId" element={<Dashboard />} />
            <Route path="/docs" element={<Docs />} />
          </Route>

          {/* Pages WITHOUT the Navigation Header */}
          <Route element={<RoomLayout />}>
            <Route path="/room/:roomId/waiting" element={<WaitingRoom />} />
            <Route path="/room/:roomId/watch" element={<Room />} />
          </Route>
          
        </Routes>
      </AnimatePresence>
    </div>
  )
}

export default App
