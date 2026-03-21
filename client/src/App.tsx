import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import WaitingRoom from './pages/WaitingRoom'
import Room from './pages/Room'

function App() {
  return (
    <div className="min-h-screen font-sans selection:bg-teal-500/30 transition-colors duration-300">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/room/:roomId" element={<Home />} />
        <Route path="/room/:roomId/waiting" element={<WaitingRoom />} />
        <Route path="/room/:roomId/watch" element={<Room />} />
      </Routes>
    </div>
  )
}

export default App
