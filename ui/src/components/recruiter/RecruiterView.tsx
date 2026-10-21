import { forceCollide, forceSimulation, forceX, forceY, scaleLinear } from 'd3'
import { useEffect, useMemo, useState } from 'react'
import { api } from '../../api'
import type { LeagueRow, PlayerSummary, RadarData, SpeedScatter } from '../../api'
import { pct, positionLabel, YDS_TO_MPH } from '../../format'
import { RadarChart } from '../RadarChart'
import { SearchSelect } from '../SearchSelect'

interface Props {
  players: PlayerSummary[]
  playerId: number | null
  minSnaps: number
}

const LEAGUE_METRICS: Record<string, string> = {
  pbwr_pff: 'Blocs réussis',
  island: 'Blocs réussis sans aide',
  pbwr_tracking: 'Blocs réussis (capteurs)',
  pressure_rate: 'Pressions laissées passer',
}

/** R2 : beeswarm, un point par OL du poste, le joueur suivi en couleur. */
function Beeswarm({ rows, highlight, label }: { rows: LeagueRow[]; highlight: number | null; label: string }) {
  const W = 640
  const H = 220
  const nodes = useMemo(() => {
    if (rows.length === 0) return []
    const x = scaleLinear()
      .domain([Math.min(...rows.map((r) => r.value)), Math.max(...rows.map((r) => r.value))])
      .range([30, W - 30])
    const sim = rows.map((r) => ({ ...r, x: x(r.value), y: H / 2, tx: x(r.value) }))
    const s = forceSimulation(sim)
      .force('x', forceX<(typeof sim)[number]>((d) => d.tx).strength(1))
      .force('y', forceY(H / 2).strength(0.05))
      .force('c', forceCollide(6))
      .stop()
    for (let i = 0; i < 120; i++) s.tick()
    return sim
  }, [rows])
  const me = rows.find((r) => r.nflId === highlight)
  return (
    <>
      <h3>
        {me
          ? `${me.name} : ${Math.round(me.percentile * 100)}e centile du poste · ${label}`
          : `${label} : un point par joueur`}
      </h3>
      <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Beeswarm de percentiles">
        {nodes.map((n) => (
          <circle
            key={n.nflId}
            cx={n.x}
            cy={n.y}
            r={n.nflId === highlight ? 8 : 5}
            fill={n.nflId === highlight ? '#3b82f6' : '#6b7280'}
            stroke={n.nflId === highlight ? '#e8ecf1' : 'none'}
          >
            <title>
              {n.name} · {pct(n.value)} · {n.n} actions · mieux que {Math.round(n.percentile * 100)} % du poste
            </title>
          </circle>
        ))}
      </svg>
      <p className="legend">
        <span className="legend__swatch" style={{ background: '#3b82f6' }} /> Joueur suivi ·{' '}
        <span className="legend__swatch" style={{ background: '#6b7280' }} /> autres OL du poste (≥ min.
        actions) · survol = nom et nombre d’actions.
      </p>
    </>
  )
}

/** R3 : un tackle de 315 lbs tient-il la vitesse ? Curseur en mph calé sur la distribution réelle. */
function SpeedScatterView({ highlight, minSnaps }: { highlight: number | null; minSnaps: number }) {
  const [mph, setMph] = useState<number | null>(null)
  const [data, setData] = useState<SpeedScatter | null>(null)
  useEffect(() => {
    api.speedScatter(mph === null ? null : mph / YDS_TO_MPH, 'T').then(setData)
  }, [mph])
  if (!data) return null
  const q = data.edge_speed_quantiles
  const maxMph = (data.edge_speed_max ?? 8) * YDS_TO_MPH
  const current = mph ?? data.fast_speed * YDS_TO_MPH
  const W = 640
  const H = 300
  const pts = data.points
  const x = scaleLinear()
    .domain([Math.min(290, ...pts.map((p) => p.weight)), Math.max(340, ...pts.map((p) => p.weight))])
    .range([50, W - 20])
  const y = scaleLinear().domain([0.5, 1]).range([H - 30, 16]).clamp(true)
  return (
    <>
      <h3>
        Contre les défenseurs à {current.toFixed(1)} mph ou plus : {data.snaps_at_or_above} actions de tackles
      </h3>
      <label className="filters__select">
        <span className="filters__label">
          Vitesse du défenseur (mph) — réglage par défaut : {(data.configured_fast_speed * YDS_TO_MPH).toFixed(1)}{' '}
          mph
        </span>
        <input
          type="range"
          min={(q['0.5'] ?? 3) * YDS_TO_MPH}
          max={maxMph}
          step={0.1}
          value={Math.min(current, maxMph)}
          onChange={(e) => setMph(Number(e.target.value))}
        />
      </label>
      <p className="muted">
        Vitesse de pointe des défenseurs de bord sur 1,5 s : moitié sous {((q['0.5'] ?? 0) * YDS_TO_MPH).toFixed(1)} mph, 9e
        décile {((q['0.9'] ?? 0) * YDS_TO_MPH).toFixed(1)} mph, 99e centile{' '}
        {((q['0.99'] ?? 0) * YDS_TO_MPH).toFixed(1)} mph, max {maxMph.toFixed(1)} mph.
        {data.snaps_at_or_above === 0 && ' Aucune action à cette vitesse : baissez le curseur.'}
      </p>
      <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Poids et blocs gagnés">
        {[0.6, 0.7, 0.8, 0.9, 1].map((v) => (
          <g key={v}>
            <line x1={50} x2={W - 20} y1={y(v)} y2={y(v)} stroke="#263040" />
            <text x={44} y={y(v) + 4} textAnchor="end">
              {Math.round(v * 100)} %
            </text>
          </g>
        ))}
        {x.ticks(6).map((w) => (
          <text key={w} x={x(w)} y={H - 8} textAnchor="middle">
            {w} lbs
          </text>
        ))}
        {pts.map((p) => (
          <circle
            key={p.nflId}
            cx={x(p.weight)}
            cy={y(p.win_rate)}
            r={Math.max(3, Math.min(12, Math.sqrt(p.n) * 1.5))}
            fill={p.nflId === highlight ? '#3b82f6' : '#6b7280'}
            opacity={p.n < minSnaps ? 0.4 : 0.9}
          >
            <title>
              {p.name} · {p.weight} lbs · {pct(p.win_rate)} sur {p.n} actions
            </title>
          </circle>
        ))}
      </svg>
      <p className="legend">
        Taille = nombre d’actions face à ces défenseurs ; points atténués sous {minSnaps} actions.
      </p>
    </>
  )
}

/** Vue recruteur V2 : R1 radar comparatif, R2 beeswarm, R3 poids × vitesse. */
export function RecruiterView({ players, playerId, minSnaps }: Props) {
  const [ids, setIds] = useState<number[]>(playerId ? [playerId] : [])
  const [radar, setRadar] = useState<RadarData | null>(null)
  const [metric, setMetric] = useState('pbwr_pff')
  const [position, setPosition] = useState('T')
  const [league, setLeague] = useState<LeagueRow[]>([])
  const [scout, setScout] = useState<{ available: boolean; message: string } | null>(null)
  useEffect(() => {
    api.scoutStatus().then(setScout)
  }, [])

  useEffect(() => {
    if (ids.length) api.radar(ids, null, {}).then(setRadar)
  }, [ids])
  useEffect(() => {
    api.league(metric, position).then(setLeague)
  }, [metric, position])

  return (
    <div>
      {scout && !scout.available && (
        <p className="alert" role="status">
          Comparaison avec les tests physiques (Combine) : {scout.message}
        </p>
      )}
      <section className="panel">
        <h3>Comparer jusqu’à 3 joueurs</h3>
        <div className="toolbar">
          {[0, 1, 2].map((k) => (
            <SearchSelect
              key={k}
              label={`Joueur ${k + 1}`}
              value={ids[k] === undefined ? '' : String(ids[k])}
              emptyLabel="—"
              placeholder="Tapez un nom…"
              options={players.map((p) => ({ value: String(p.nflId), label: p.name, hint: `${positionLabel(p.position)} · ${p.team}` }))}
              onChange={(v) => {
                const next = [...ids]
                if (v) next[k] = Number(v)
                else next.splice(k, 1)
                setIds(next.filter(Boolean))
              }}
            />
          ))}
        </div>
        {radar && ids.length > 0 ? <RadarChart data={radar} minSnaps={minSnaps} /> : <p className="muted">Choisis un joueur.</p>}
      </section>
      <section className="panel">
        <div className="toolbar">
          <SearchSelect
            label="Chiffre comparé"
            value={metric}
            options={Object.entries(LEAGUE_METRICS).map(([k, v]) => ({ value: k, label: v }))}
            onChange={setMetric}
          />
          <SearchSelect
            label="Poste"
            value={position}
            options={[
              { value: 'T', label: 'Tackle', hint: 'extérieur de la ligne' },
              { value: 'G', label: 'Guard', hint: 'intérieur de la ligne' },
              { value: 'C', label: 'Centre', hint: 'milieu de la ligne' },
            ]}
            onChange={setPosition}
          />
        </div>
        <Beeswarm rows={league} highlight={ids[0] ?? null} label={LEAGUE_METRICS[metric]} />
      </section>
      <section className="panel">
        <SpeedScatterView highlight={ids[0] ?? null} minSnaps={minSnaps} />
      </section>
    </div>
  )
}
