import { Routes, Route, useLocation } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import Home from './pages/Home'
import WaitingRoom from './pages/WaitingRoom'
import Room from './pages/Room'
import Docs from './pages/Docs'
import { AnimatePresence } from 'framer-motion'

function App() {
  const location = useLocation()

  return (
    <div className="min-h-screen font-sans selection:bg-teal-500/30 transition-colors duration-300">
      <Toaster position="bottom-right" toastOptions={{
        style: {
          background: '#18181b',
          color: '#fff',
          border: '1px solid #27272a',
        },
      }} />
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<Home />} />
          <Route path="/room/:roomId" element={<Home />} />
          <Route path="/room/:roomId/waiting" element={<WaitingRoom />} />
          <Route path="/room/:roomId/watch" element={<Room />} />
          <Route path="/docs" element={<Docs />} />
        </Routes>
      </AnimatePresence>
    </div>
  )
}

export default App
