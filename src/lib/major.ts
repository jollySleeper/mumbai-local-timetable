// Major stations highlighted green in the train timeline, mirroring the
// familiar app's emphasis (junctions / principal halts). Display only.
export const MAJOR_STATIONS = new Set([
  'CHURCHGATE', 'MUMBAI CENTRAL', 'DADAR', 'BANDRA', 'ANDHERI', 'BORIVALI',
  'VASAI ROAD', 'BHAYANDAR', 'VIRAR', 'DAHANU ROAD', 'CSMT', 'KURLA',
  'GHATKOPAR', 'THANE', 'KALYAN', 'DOMBIVLI', 'PANVEL', 'VASHI', 'NERUL',
  'BELAPUR CBD', 'KHARGHAR', 'PUNE', 'LONAVLA', 'DIVA JN', 'ROHA',
])

export function sideLabel(side: string): string {
  if (side === 'L') return 'LEFT'
  if (side === 'R') return 'RIGHT'
  if (side === 'B') return 'BOTH'
  return side
}
