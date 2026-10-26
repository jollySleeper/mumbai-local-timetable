// Shared types mirroring BUILD_SPEC §5.3 wire schemas.
// Raw* interfaces are the on-disk JSON (short fields); readable interfaces
// are what components use (mapped in data.ts at the fetch boundary).

export interface Meta {
  version: string
  generatedAt: string
  source: string
  counts: { trains: number; stations: number; stops: number }
}

export interface StationInfo {
  index: number
  name: string // raw uppercase, e.g. "ANDHERI"
}

export interface LineInfo {
  code: string
  name: string
  headerA: string
  headerB: string
  stations: StationInfo[]
}

export interface StationsFile {
  lines: LineInfo[]
}

// --- wire (raw) shapes ---
export interface RawDeparture {
  m: number
  trainId: string
  no: string | null
  dest: string
  destIndex: number
  dd: string
  origin: string
  pattern: string
  note: string
  pf: string
  side: string
}
export interface RawDeparturesFile {
  line: string
  station: string
  stationIndex: number
  departures: RawDeparture[]
}
export interface RawTrainStop {
  station: string
  stationIndex: number
  m: number
  time: string
  pf: string
  side: string
}
export interface RawTrainRun {
  id: string
  line: string
  no: string | null
  origin: string
  destination: string
  pattern: string
  note: string
  stops: RawTrainStop[]
}

// --- readable shapes (components only see these) ---
export interface Departure {
  minutes: number
  trainId: string
  trainNumber: string | null
  destination: string
  destinationIndex: number
  destinationDisplay: string
  origin: string
  pattern: string
  note: string
  platform: string
  side: string
}
export interface DeparturesFile {
  line: string
  station: string
  stationIndex: number
  departures: Departure[]
}
export interface TrainStop {
  station: string
  stationIndex: number
  minutes: number
  time: string
  platform: string
  side: string
}
export interface TrainRun {
  id: string
  line: string
  trainNumber: string | null
  origin: string
  destination: string
  pattern: string
  note: string
  stops: TrainStop[]
}
export interface TrainIndexEntry {
  no: string
  trainId: string
  line: string
  origin: string
  destination: string
  firstTime: string
}
