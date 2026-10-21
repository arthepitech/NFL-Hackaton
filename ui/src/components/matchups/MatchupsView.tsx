import { useEffect, useState } from 'react'
import { api } from '../../api'
import type { Filters } from '../../api'
import { teamOptions } from '../../format'
import type { OpenPlay } from '../PlayList'
import { CoverageHeatmap } from './CoverageHeatmap'
import { DuelMatrix } from './DuelMatrix'
import { PackagesChart } from './PackagesChart'
import { ProtectionMap } from './ProtectionMap'
import { SearchSelect } from '../SearchSelect'

const VIEWS = [
  { id: 'duels', label: 'Qui bat qui' },
  { id: 'protection', label: 'D’où vient la pression' },
  { id: 'coverage', label: 'Défenses en couverture' },
  { id: 'packages', label: 'Joueurs qui chargent' },
] as const
type View = (typeof VIEWS)[number]['id']

interface Props {
  filters: Filters
  minSnaps: number
  onOpenPlay: (p: OpenPlay) => void
}

/** Niveau 2 : préparation du match de la semaine. */
export function MatchupsView({ filters, minSnaps, onOpenPlay }: Props) {
  const [teams, setTeams] = useState<string[]>([])
  const [team, setTeam] = useState('DEN')
  const [opponent, setOpponent] = useState('LV')
  const [view, setView] = useState<View>('duels')

  useEffect(() => {
    api.teams().then(setTeams)
  }, [])

  // Attaque = notre équipe (duels, protection) ; défense = adversaire (couvertures, paquets).
  const defensive = view === 'coverage' || view === 'packages'
  return (
    <div>
      <div className="toolbar">
        <SearchSelect
          label="Notre équipe"
          value={team}
          options={teamOptions(teams)}
          onChange={setTeam}
        />
        <SearchSelect
          label="Adversaire"
          value={opponent}
          emptyLabel="Toutes les équipes"
          options={teamOptions(teams)}
          onChange={setOpponent}
        />
      </div>
      <nav className="subtabs" aria-label="Vues Matchups">
        {VIEWS.map((v) => (
          <button
            key={v.id}
            type="button"
            className={`chip${view === v.id ? ' chip--on' : ''}`}
            aria-pressed={view === v.id}
            onClick={() => setView(v.id)}
          >
            {v.label}
          </button>
        ))}
      </nav>
      {defensive && (
        <p className="muted">
          Défense étudiée : {opponent || 'toute la ligue'}.
        </p>
      )}
      {view === 'duels' && (
        <DuelMatrix team={team} opponent={opponent} filters={filters} minSnaps={minSnaps} onOpenPlay={onOpenPlay} />
      )}
      {view === 'protection' && <ProtectionMap team={team} filters={filters} minSnaps={minSnaps} />}
      {view === 'coverage' && (
        <CoverageHeatmap team={opponent} filters={filters} minSnaps={minSnaps} />
      )}
      {view === 'packages' && <PackagesChart team={opponent} filters={filters} minSnaps={minSnaps} />}
    </div>
  )
}
