export type MetricKey =
  | 'pbwr_pff'
  | 'pbwr_tracking'
  | 'island'
  | 'ttp'
  | 'pressure_rate'
  | 'time_to_throw'
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
  cause: string | null
  reason: string | null
  counted: boolean
}

export interface WeekRow {
  week: number
  n: number
  pbwr_pff: number
  ttp: number | null
  ttp_n: number
  pressure_rate: number
  position_pbwr_pff: number | null
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

async function send<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`${res.status} ${path}`)
  return res.json() as Promise<T>
}

// --- V2 ---
export interface MatchupData {
  rows: { nflId: number; name: string; alignment: string; n: number }[]
  cols: { nflId: number; name: string; team: string; n: number }[]
  cells: { blockerId: number; rusherId: number; n: number; win_rate: number; ttp: number | null }[]
  projection: {
    rusherId: number
    rusher: string
    usual: string
    snaps: number
    facing: string | null
    blockerId: number | null
    blocker: string | null
  }[]
}

export interface ProtectionData {
  positions: { alignment: string; n: number; rate: number }[]
  gaps: { side: string | null; gap: string | null; n: number; ttp: number | null }[]
  pressures: number
}

export interface CoverageRow {
  coverage: string
  situation: string
  n: number
  yards_per_play: number
  completion: number | null
  first_down_rate: number
}

export interface PackageRow {
  package: string
  n: number
  pressure_rate: number
  sack_rate: number
  blitz: boolean
  ttp_median: number | null
  ttp_quartiles: (number | null)[]
  ttp_n: number
  alignments: { alignments: string; n: number }[]
}

export interface PathRow {
  gameId: number
  playId: number
  week: number
  defensiveTeam: string
  lost: boolean
  defeat_t: number | null
  blockedId: number
  blocker: [number, number][]
  rusher: [number, number][]
}

export interface Diagnosis {
  cause: string | null
  reason: string | null
  probable: boolean
  features: Record<string, number | boolean | null>
  rules: Record<string, string>
  tag: { proposed: string; cause: string; comment: string; author: string; confirmed: boolean } | null
}

export interface Clip {
  angle: string
  url: string
  snap_offset_s: number
}

export interface SetPath {
  nflId: number
  name: string
  n: number
  path: { t: number; dx: number; dy: number; sx: number | null }[]
}

export interface SetCompare {
  alignment: string
  window_s: number
  player: SetPath
  reference: SetPath | null
}

export interface Playlist {
  id: number
  name: string
  author: string
  items: { id: number; gameId: number; playId: number; nflId: number; t: number | null; comment: string }[]
}

export type AxisKey = 'PP' | 'PA' | 'SW' | 'island' | 'fast' | 'heavy'
export type Axes = Record<AxisKey, { value: number | null; n: number }>

export interface RadarData {
  labels: Record<AxisKey, string>
  fast_speed: number
  heavy_lbs: number
  players: { nflId: number; name: string; position: string; axes: Axes }[]
  position_average: { position: string; axes: Axes }
}

export interface LeagueRow {
  nflId: number
  name: string
  position: string
  value: number
  n: number
  percentile: number
}

export interface SpeedScatter {
  fast_speed: number
  configured_fast_speed: number
  points: { nflId: number; name: string; weight: number; n: number; win_rate: number }[]
  edge_speed_quantiles: Record<string, number | null>
  edge_speed_max: number | null
  snaps_at_or_above: number
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
  teams: () => get<string[]>('/teams'),
  matchups: (team: string, opponent: string, f: Filters) =>
    get<MatchupData>(`/matchups${toQuery(f, opponent ? { team, opponent } : { team })}`),
  matchupDuel: (blocker: number, rusher: number, f: Filters) =>
    get<SnapRow[]>(`/matchups/duel${toQuery(f, { blocker, rusher })}`),
  protection: (team: string, f: Filters) => get<ProtectionData>(`/protection${toQuery(f, { team })}`),
  coverage: (team: string, f: Filters) =>
    get<CoverageRow[]>(`/coverage${toQuery(f, team ? { team } : {})}`),
  packages: (team: string, f: Filters) =>
    get<PackageRow[]>(`/packages${toQuery(f, team ? { team } : {})}`),
  paths: (id: number, mode: 'defeats' | 'all', limit: number, f: Filters) =>
    get<PathRow[]>(`/players/${id}/paths${toQuery(f, { mode, limit })}`),
  diagnosis: (g: number, p: number, id: number) => get<Diagnosis>(`/diagnosis/${g}/${p}/${id}`),
  tagDiagnosis: (g: number, p: number, id: number, cause: string, comment: string) =>
    send<Diagnosis['tag']>('POST', `/diagnosis/${g}/${p}/${id}`, { cause, comment }),
  tags: () => get<string[]>('/tags'),
  clips: (g: number, p: number) => get<Clip[]>(`/video/${g}/${p}`),
  setClip: (g: number, p: number, clip: Clip) => send<Clip[]>('PUT', `/video/${g}/${p}`, clip),
  setPath: (id: number, reference?: number) =>
    get<SetCompare>(`/players/${id}/set${toQuery({}, reference ? { reference } : {})}`),
  playlists: (player: number) => get<Playlist[]>(`/playlists${toQuery({}, { player })}`),
  createPlaylist: (name: string, player_id: number) =>
    send<{ id: number }>('POST', '/playlists', { name, player_id }),
  addItem: (
    playlist: number,
    item: { gameId: number; playId: number; nflId: number; t: number | null; comment: string },
  ) => send<{ id: number }>('POST', `/playlists/${playlist}/items`, item),
  deleteItem: (item: number) => send<{ ok: boolean }>('DELETE', `/playlists/items/${item}`),
  radar: (ids: number[], fastSpeed: number | null, f: Filters) =>
    get<RadarData>(
      `/radar${toQuery({ ...f, ids: ids.map(String) }, fastSpeed === null ? {} : { fast_speed: fastSpeed })}`,
    ),
  league: (metric: string, position: string) =>
    get<LeagueRow[]>(`/league${toQuery({}, position ? { metric, position } : { metric })}`),
  badges: (id: number) => get<{ kind: 'top' | 'bottom'; label: string; n: number }[]>(`/players/${id}/badges`),
  scoutStatus: () => get<{ available: boolean; message: string; columns: string[] }>('/scout/status'),
  speedScatter: (fastSpeed: number | null, position: string) =>
    get<SpeedScatter>(
      `/speed-scatter${toQuery({}, fastSpeed === null ? { position } : { fast_speed: fastSpeed, position })}`,
    ),
}
