import { Route, Routes } from 'react-router-dom'
import Home from './pages/Home'
import StationBoard from './pages/StationBoard'
import TrainDetail from './pages/TrainDetail'

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/station/:line/:stationIndex" element={<StationBoard />} />
      <Route path="/train/:line/:seq" element={<TrainDetail />} />
    </Routes>
  )
}
