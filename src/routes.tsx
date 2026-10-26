import { Route, Routes } from 'react-router-dom'
import Home from './pages/Home'
import StationBoard from './pages/StationBoard'
import StationDestinations from './pages/StationDestinations'
import TrainDetail from './pages/TrainDetail'

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/s/:name" element={<StationDestinations />} />
      <Route path="/board/:name/:cluster" element={<StationBoard />} />
      {/* Legacy per-line board URL kept working via StationBoard redirect handling */}
      <Route path="/station/:line/:stationIndex" element={<StationBoard />} />
      <Route path="/train/:line/:seq" element={<TrainDetail />} />
    </Routes>
  )
}
