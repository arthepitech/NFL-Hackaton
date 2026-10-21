import { useEffect, useState } from 'react'
import { api } from './api'
import type { Filters, Meta, PlayerSummary, ScoutCardData } from './api'
import { FiltersBar } from './components/FiltersBar'
import { PlayLab } from './components/PlayLab'
import type { OpenPlay } from './components/PlayList'
import { MatchupsView } from './components/matchups/MatchupsView'
import { PlayerView } from './components/player/PlayerView'
import { RecruiterView } from './components/recruiter/RecruiterView'
import { ReportView } from './components/ReportView'
import { ScoutCard } from './components/ScoutCard'
import { readDeepLink } from './geometry'

const LEVELS = [
  { id: 'scout', label: 'Fiche joueur', enabled: true },
  { id: 'matchups', label: 'Duels et adversaire', enabled: true },
  { id: 'playlab', label: 'Revoir une action', enabled: true },
  { id: 'player', label: 'Mon suivi', enabled: true },
  { id: 'recruiter', label: 'Recrutement', enabled: true },
  { id: 'report', label: 'Rapport de match', enabled: true },
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
  const [queue, setQueue] = useState<OpenPlay[]>([])
  const [teams, setTeams] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([api.meta(), api.players(), api.teams()]).then(
      ([m, p, t]) => {
        setMeta(m)
        setPlayers(p)
        setTeams(t)
      },
      (e: Error) => setError(e.message),
    )
  }, [])

  useEffect(() => {
    if (playerId !== null) api.scoutCard(playerId, {}).then(setSeason)
  }, [playerId])

  const openPlay = (p: OpenPlay) => {
    setQueue([])
    setTarget(p)
    setLevel('playlab')
  }
  const playQueue = (q: OpenPlay[]) => {
    if (q.length === 0) return
    setTarget(q[0])
    setQueue(q.slice(1))
    setLevel('playlab')
  }

  return (
    <main className="shell">
      <header className="shell__header">
        <div>
          <h1>Trench Lab</h1>
          <p className="muted small">L’analyse de la ligne offensive, simplement</p>
        </div>
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
          remaining={queue.length}
          onNext={() => playQueue(queue)}
        />
      )}
      {meta && level === 'player' && (
        <PlayerView
          playerId={playerId}
          name={season?.player.name ?? ''}
          tier={season?.metrics.pbwr_pff.tier ?? null}
          minSnaps={meta.thresholds.min_snaps_display}
          players={players}
          onOpenPlay={openPlay}
          onPlayQueue={playQueue}
        />
      )}
      {meta && level === 'matchups' && (
        <>
          <FiltersBar meta={meta} filters={filters} onChange={setFilters} />
          <MatchupsView
            filters={filters}
            minSnaps={meta.thresholds.min_snaps_display}
            onOpenPlay={openPlay}
          />
        </>
      )}
      {meta && level === 'report' && <ReportView teams={teams} />}
      {meta && level === 'recruiter' && (
        <RecruiterView
          players={players}
          playerId={playerId}
          minSnaps={meta.thresholds.min_snaps_display}
        />
      )}
    </main>
  )
}

export default App
