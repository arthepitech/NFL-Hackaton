import { line, scaleLinear } from 'd3'
import { useEffect, useState } from 'react'
import { api } from '../api'
import type { Filters, PathRow } from '../api'
import { secs } from '../format'
import type { OpenPlay } from './PlayList'

interface Props {
  playerId: number
  filters: Filters
  onOpenPlay: (p: OpenPlay) => void
}

const SPAN = 8 // yards montrés autour du bloqueur
const COLORS = { blocker: '#3b82f6', rusher: '#f59e0b', won: '#2fbf71', lost: '#e5484d' }

function MiniField({ row, size, onOpen }: { row: PathRow; size: number; onOpen: () => void }) {
  // Vue de derrière la ligne : extérieur à droite (+y), recul du bloqueur vers le bas (−x).
  const sx = scaleLinear().domain([-SPAN, SPAN]).range([0, size])
  const sy = scaleLinear().domain([SPAN / 2, -SPAN * 1.5]).range([0, size])
  const path = line<[number, number]>()
    .x((p) => sx(p[1]))
    .y((p) => sy(p[0]))
  return (
    <button type="button" className="mini" onClick={onOpen} aria-label={`Ouvrir le jeu, semaine ${row.week}`}>
      <svg width={size} height={size} role="img">
        <rect width={size} height={size} fill="#123018" rx={6} />
        <line x1={sx(0)} x2={sx(0)} y1={0} y2={size} stroke="rgba(255,255,255,0.15)" />
        <path d={path(row.blocker) ?? ''} stroke={COLORS.blocker} strokeWidth={2} fill="none" />
        <path d={path(row.rusher) ?? ''} stroke={COLORS.rusher} strokeWidth={2} fill="none" />
        <circle cx={sx(0)} cy={sy(0)} r={3} fill={COLORS.blocker} />
      </svg>
      <span>
        S{row.week} vs {row.defensiveTeam} · défaite {secs(row.defeat_t)}
      </span>
    </button>
  )
}

/** C8 : 12 défaites alignées sur le snap. C9 : toutes les trajectoires des rushers (spaghetti). */
export function PathsView({ playerId, filters, onOpenPlay }: Props) {
  const [mode, setMode] = useState<'defeats' | 'all'>('defeats')
  const [rows, setRows] = useState<PathRow[]>([])
  useEffect(() => {
    api.paths(playerId, mode, mode === 'defeats' ? 12 : 150, filters).then(setRows)
  }, [playerId, mode, filters])

  const open = (r: PathRow) =>
    onOpenPlay({ gameId: r.gameId, playId: r.playId, blockerId: playerId, rusherId: r.blockedId, t: r.defeat_t })
  const size = 420
  const sx = scaleLinear().domain([-SPAN, SPAN]).range([0, size])
  const sy = scaleLinear().domain([SPAN / 2, -SPAN * 1.5]).range([0, size])
  const path = line<[number, number]>()
    .x((p) => sx(p[1]))
    .y((p) => sy(p[0]))
  const outside = rows.filter((r) => (r.rusher.at(-1)?.[1] ?? 0) > 0).length

  return (
    <section className="panel">
      <nav className="subtabs" aria-label="Trajectoires">
        <button type="button" className={`chip${mode === 'defeats' ? ' chip--on' : ''}`} aria-pressed={mode === 'defeats'} onClick={() => setMode('defeats')}>
          Ses 12 défaites les plus rapides
        </button>
        <button type="button" className={`chip${mode === 'all' ? ' chip--on' : ''}`} aria-pressed={mode === 'all'} onClick={() => setMode('all')}>
          Toutes les courses de ses défenseurs
        </button>
      </nav>
      {rows.length === 0 ? (
        <p className="muted">Aucune trajectoire avec ces filtres.</p>
      ) : mode === 'defeats' ? (
        <>
          <h3>Ses 12 défaites les plus rapides, alignées sur le snap</h3>
          <div className="minis">
            {rows.map((r) => (
              <MiniField key={`${r.gameId}-${r.playId}`} row={r} size={150} onOpen={() => open(r)} />
            ))}
          </div>
        </>
      ) : (
        <>
          <h3>
            Son défenseur passe par l’extérieur sur {outside} duels sur {rows.length}
          </h3>
          <svg className="chart spaghetti" viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Trajectoires des rushers">
            <rect width={size} height={size} fill="#123018" rx={8} />
            <line x1={sx(0)} x2={sx(0)} y1={0} y2={size} stroke="rgba(255,255,255,0.2)" />
            <text x={size - 8} y={16} textAnchor="end">
              Extérieur →
            </text>
            <text x={8} y={16}>
              ← Intérieur
            </text>
            {rows.map((r) => (
              <path
                key={`${r.gameId}-${r.playId}`}
                d={path(r.rusher) ?? ''}
                stroke={r.lost ? COLORS.lost : COLORS.won}
                strokeOpacity={0.45}
                strokeWidth={1.5}
                fill="none"
                onClick={() => open(r)}
              />
            ))}
            <circle cx={sx(0)} cy={sy(0)} r={5} fill={COLORS.blocker} />
          </svg>
        </>
      )}
      <p className="legend">
        <span className="legend__swatch" style={{ background: COLORS.blocker }} /> Le bloqueur (point de départ) ·{' '}
        <span className="legend__swatch" style={{ background: COLORS.rusher }} /> Son défenseur
        {mode === 'all' && (
          <>
            {' '}
            · <span className="legend__swatch" style={{ background: COLORS.won }} /> bloc tenu ·{' '}
            <span className="legend__swatch" style={{ background: COLORS.lost }} /> bloc perdu
          </>
        )}
        . Vu de derrière la ligne, l’extérieur toujours à droite.
      </p>
    </section>
  )
}
