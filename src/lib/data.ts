import type {
  DeparturesFile,
  Meta,
  RawDeparturesFile,
  RawTrainRun,
  StationsFile,
  TrainIndexEntry,
  TrainRun,
} from './types'

const base = import.meta.env.BASE_URL // e.g. "/mumbai-local-timetable/"

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${base}data/${path}`)
  if (!res.ok) throw new Error(`Failed to load data/${path}: ${res.status}`)
  return (await res.json()) as T
}

export async function getMeta(): Promise<Meta> {
  const d = await fetchJson<Meta>('meta.json')
  if (!d.version || !d.counts) throw new Error('Malformed meta.json')
  return d
}

export async function getStations(): Promise<StationsFile> {
  const d = await fetchJson<StationsFile>('stations.json')
  if (!Array.isArray(d.lines)) throw new Error('Malformed stations.json')
  return d
}

export async function getDepartures(line: string, stationIndex: number): Promise<DeparturesFile> {
  const raw = await fetchJson<RawDeparturesFile>(`departures/${line}/${stationIndex}.json`)
  if (!Array.isArray(raw.departures)) throw new Error('Malformed departures file')
  return {
    line: raw.line,
    station: raw.station,
    stationIndex: raw.stationIndex,
    departures: raw.departures.map((d) => ({
      minutes: d.m,
      trainId: d.trainId,
      trainNumber: d.no,
      destination: d.dest,
      destinationIndex: d.destIndex,
      destinationDisplay: d.dd ?? d.dest,
      origin: d.origin,
      pattern: d.pattern,
      note: d.note,
      platform: d.pf,
      side: d.side,
    })),
  }
}

export async function getTrain(trainId: string): Promise<TrainRun> {
  // trainId is "<line>:<seq>", e.g. "W:108" -> trains/W_108.json
  const [line, seq] = trainId.split(':')
  if (!line || !seq) throw new Error(`Bad trainId: ${trainId}`)
  const raw = await fetchJson<RawTrainRun>(`trains/${line}_${seq}.json`)
  if (!Array.isArray(raw.stops)) throw new Error('Malformed train file')
  return {
    id: raw.id,
    line: raw.line,
    trainNumber: raw.no,
    origin: raw.origin,
    destination: raw.destination,
    pattern: raw.pattern,
    note: raw.note,
    stops: raw.stops.map((s) => ({
      station: s.station,
      stationIndex: s.stationIndex,
      minutes: s.m,
      time: s.time,
      platform: s.pf,
      side: s.side,
    })),
  }
}

export async function getTrainByParts(line: string, seq: string): Promise<TrainRun> {
  return getTrain(`${line}:${seq}`)
}

export async function getTrainIndex(): Promise<TrainIndexEntry[]> {
  const d = await fetchJson<TrainIndexEntry[]>('train-index.json')
  if (!Array.isArray(d)) throw new Error('Malformed train-index.json')
  return d
}
