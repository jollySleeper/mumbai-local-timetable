import { useParams } from 'react-router-dom'

export default function StationBoard() {
  const { line, stationIndex } = useParams()
  return (
    <main className="mx-auto w-full max-w-[640px] px-4 py-6">
      <p>
        Station board for {line}/{stationIndex} — coming in the next commit.
      </p>
    </main>
  )
}
