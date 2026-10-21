import { useEffect, useState } from 'react'
import { api } from './api'
import type { Filters, Meta, PlayerSummary, ScoutCardData } from './api'
import { FiltersBar } from './components/FiltersBar'
import { PlayerCard } from './components/PlayerCard'
import { PlayLab } from './components/PlayLab'
import type { OpenPlay } from './components/PlayList'
import { ScoutCard } from './components/ScoutCard'
import { readDeepLink } from './geometry'

const LEVELS = [
  { id: 'scout', label: 'Scout Card', enabled: true },
  { id: 'matchups', label: 'Matchups', enabled: false },
  { id: 'playlab', label: 'Play Lab', enabled: true },
  { id: 'player', label: 'Carte joueur', enabled: true },
] as const
type Level = (typeof LEVELS)[number]['id']

const LINK = readDeepLink(window.location.search)
const isLevel = (v: string | null): v is Level => LEVELS.some((l) => l.enabled && l.id === v)

function App() {
  const [level, setLevel] = useState<Level>(isLevel(LINK.view) ? LINK.view : 'scout')
  const [meta, setMeta] = useState<Meta | null>(null)
  const [players, setPlayers] = useState<PlayerSummary[]>([])
  const [playerId, setPlayerId] = useState<number | null>(LINK.playerId)
  const [season, setSeason] = useState<ScoutCardData | null>(null)
  const [filters, setFilters] = useState<Filters>({})
  const [target, setTarget] = useState<OpenPlay | null>(LINK.target)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([api.meta(), api.players()]).then(
      ([m, p]) => {
        setMeta(m)
        setPlayers(p)
      },
      (e: Error) => setError(e.message),
    )
  }, [])

  useEffect(() => {
    if (playerId !== null) api.scoutCard(playerId, {}).then(setSeason)
  }, [playerId])

  const openPlay = (p: OpenPlay) => {
    setTarget(p)
    setLevel('playlab')
  }

  return (
    <main className="shell">
      <header className="shell__header">
        <h1>Trench Lab</h1>
        <nav aria-label="Niveaux d'analyse">
          {LEVELS.map((l) => (
            <button
              key={l.id}
              type="button"
              className={`tab${level === l.id ? ' tab--on' : ''}`}
              disabled={!l.enabled}
              title={l.enabled ? undefined : 'Version 2'}
              aria-current={level === l.id ? 'page' : undefined}
              onClick={() => setLevel(l.id)}
            >
              {l.label}
            </button>
          ))}
        </nav>
      </header>
      {error && <p className="error">API indisponible : {error}</p>}
      {meta && level === 'scout' && (
        <>
          <FiltersBar meta={meta} filters={filters} onChange={setFilters} />
          <ScoutCard
            meta={meta}
            players={players}
            playerId={playerId}
            onPlayer={setPlayerId}
            filters={filters}
            onOpenPlay={openPlay}
          />
        </>
      )}
      {meta && level === 'playlab' && (
        <PlayLab
          key={target ? `${target.gameId}-${target.playId}-${target.blockerId}` : 'vide'}
          target={target}
          radius={meta.thresholds.pressure_radius_yd}
        />
      )}
      {meta && level === 'player' && (
        <PlayerCard
          playerId={playerId}
          name={season?.player.name ?? ''}
          tier={season?.metrics.pbwr_pff.tier ?? null}
          minSnaps={meta.thresholds.min_snaps_display}
        />
      )}
    </main>
  )
}

export default App
