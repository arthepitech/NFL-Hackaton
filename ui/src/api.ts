export type MetricKey = 'pbwr_pff' | 'pbwr_tracking' | 'ttp' | 'pressure_rate' | 'time_to_throw'
export type Tier = 'top' | 'bottom' | null

export interface MetricValue {
  value: number | null
  n: number
  low_sample: boolean
  tier: Tier
}

export interface Definition {
  label: string
  definition: string
  better: 'high' | 'low' | null
}

export interface Meta {
  thresholds: Record<string, number>
  definitions: Record<MetricKey, Definition>
  options: Record<string, (string | number)[]>
}

export interface PlayerSummary {
  nflId: number
  name: string
  position: string
  team: string
  snaps: number
}

export interface ScoutCardData {
  player: {
    nflId: number
    name: string
    position: string
    alignment: string | null
    height_in: number
    weight: number
    age: number | null
    college: string | null
    team: string | null
  }
  metrics: Record<MetricKey, MetricValue>
  alerts: { kind: string; points: number; message: string }[]
}

export interface SnapRow {
  gameId: number
  playId: number
  week: number
  defensiveTeam: string
  quarter: number
  gameClock: string
  down: number
  yardsToGo: number
  playDescription: string
  pff_positionLinedUp: string
  pff_blockType: string | null
  blockedId: number | null
  blockedName: string | null
  pff_loss: boolean
  pressure_allowed: boolean
  ttp: number | null
  defeat_t: number | null
  t_end: number | null
  counted: boolean
}

export interface WeekRow {
  week: number
  n: number
  pbwr_pff: number
  ttp: number | null
  ttp_n: number
  pressure_rate: number
}

export interface PlayData {
  meta: Record<string, string | number | null>
  frames: { frameId: number; t: number; event: string | null }[]
  frame_end: number
  players: {
    id: string
    name: string
    jersey: number | null
    team: string
    role: string | null
    alignment: string | null
  }[]
  positions: Record<string, [number, number, number | null, number][]>
  qbId: number | null
  ol: number[]
  blocks: { blockerId: number; rusherId: number; blockType: string | null }[]
}

export interface DuelPoint {
  t: number
  d_qb: number
  rusher_s: number
  depth_gap: number
  shoulder_angle: number
  blocker_x: number
  blocker_y: number
  rusher_x: number
  rusher_y: number
}

export interface DuelData {
  series: DuelPoint[]
  markers: Record<string, number | null>
  t_end: number | null
  pff_loss: boolean
}

export type Filters = Record<string, string[] | string | undefined>

export function toQuery(filters: Filters, extra: Record<string, string | number | boolean> = {}) {
  const q = new URLSearchParams()
  for (const [key, value] of Object.entries(filters)) {
    if (Array.isArray(value)) value.forEach((v) => q.append(key, v))
    else if (value !== undefined && value !== '') q.append(key, value)
  }
  for (const [key, value] of Object.entries(extra)) q.append(key, String(value))
  const s = q.toString()
  return s ? `?${s}` : ''
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`/api${path}`)
  if (!res.ok) throw new Error(`${res.status} ${path}`)
  return res.json() as Promise<T>
}

export const api = {
  meta: () => get<Meta>('/meta'),
  players: () => get<PlayerSummary[]>('/players'),
  scoutCard: (id: number, f: Filters) => get<ScoutCardData>(`/players/${id}/scout-card${toQuery(f)}`),
  plays: (id: number, metric: MetricKey, f: Filters) =>
    get<SnapRow[]>(`/players/${id}/plays${toQuery(f, { metric })}`),
  defeats: (id: number, f: Filters, confirmed: boolean) =>
    get<SnapRow[]>(`/players/${id}/defeats${toQuery(f, { confirmed })}`),
  weekly: (id: number) => get<WeekRow[]>(`/players/${id}/weekly`),
  play: (g: number, p: number) => get<PlayData>(`/plays/${g}/${p}`),
  duel: (g: number, p: number, blocker: number, rusher: number) =>
    get<DuelData>(`/plays/${g}/${p}/duel${toQuery({}, { blocker, rusher })}`),
}
