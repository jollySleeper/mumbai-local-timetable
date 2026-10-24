import { useParams } from 'react-router-dom'

export default function TrainDetail() {
  const { line, seq } = useParams()
  return (
    <main className="mx-auto w-full max-w-[640px] px-4 py-6">
      <p>
        Train {line}/{seq} — coming in a later commit.
      </p>
    </main>
  )
}
