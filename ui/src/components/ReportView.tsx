import { useEffect, useState } from 'react'
import { api } from '../api'
import type { CoverageRow, MatchupData, PackageRow } from '../api'
import { COVERAGE_HELP, pct, secs, teamOptions, TEAM_NAMES } from '../format'
import { SearchSelect } from './SearchSelect'

interface Props {
  teams: string[]
}

/** Rapport adverse exportable : impression navigateur → PDF (aucune dépendance ajoutée). */
export function ReportView({ teams }: Props) {
  const [team, setTeam] = useState('DEN')
  const [opponent, setOpponent] = useState('LV')
  const [matchups, setMatchups] = useState<MatchupData | null>(null)
  const [coverage, setCoverage] = useState<CoverageRow[]>([])
  const [packages, setPackages] = useState<PackageRow[]>([])

  useEffect(() => {
    api.matchups(team, opponent, {}).then(setMatchups)
    api.coverage(opponent, {}).then((rows) => setCoverage([...rows].sort((a, b) => b.n - a.n).slice(0, 10)))
    api.packages(opponent, {}).then(setPackages)
  }, [team, opponent])

  return (
    <article className="report">
      <div className="toolbar no-print">
        <SearchSelect
          label="Notre équipe"
          value={team}
          options={teamOptions(teams)}
          onChange={setTeam}
        />
        <SearchSelect
          label="Adversaire"
          value={opponent}
          options={teamOptions(teams)}
          onChange={setOpponent}
        />
        <button type="button" className="chip chip--on" onClick={() => window.print()}>
          Exporter en PDF
        </button>
      </div>
      <h2>
        Rapport de match : {TEAM_NAMES[team] ?? team} contre {TEAM_NAMES[opponent] ?? opponent}
      </h2>
      <p className="muted">
        Usage interne au staff (données sous licence). Saison 2021, semaines 1 à 8 : peu de
        matchs, chaque chiffre indique sur combien d’actions il repose.
      </p>
      <h3>Qui va affronter qui sur notre ligne</h3>
      <table className="simple">
        <thead>
          <tr>
            <th>Défenseur</th>
            <th>Placement habituel</th>
            <th>Notre bloqueur en face</th>
            <th>Charges</th>
          </tr>
        </thead>
        <tbody>
          {matchups?.projection.map((p) => (
            <tr key={p.rusherId}>
              <td>{p.rusher}</td>
              <td>{p.usual}</td>
              <td>{p.facing ? `${p.facing} · ${p.blocker ?? '—'}` : 'Joueur de blitz (pas d’adversaire fixe)'}</td>
              <td>{p.snaps}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h3>Combien de joueurs {opponent} envoie sur le quarterback</h3>
      <table className="simple">
        <thead>
          <tr>
            <th>Joueurs qui chargent</th>
            <th>Actions</th>
            <th>Pression sur le QB</th>
            <th>Sacks</th>
            <th>Délai avant pression</th>
          </tr>
        </thead>
        <tbody>
          {packages.map((p) => (
            <tr key={p.package}>
              <td>{p.package}</td>
              <td>{p.n}</td>
              <td>{pct(p.pressure_rate)}</td>
              <td>{pct(p.sack_rate)}</td>
              <td>{secs(p.ttp_median)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h3>Les défenses en couverture préférées de {opponent}</h3>
      <table className="simple">
        <thead>
          <tr>
            <th>Défense en couverture</th>
            <th>Situation</th>
            <th>Actions</th>
            <th>Yards concédés par action</th>
            <th>1er essai concédé</th>
          </tr>
        </thead>
        <tbody>
          {coverage.map((c) => (
            <tr key={`${c.coverage}-${c.situation}`}>
              <td title={COVERAGE_HELP[c.coverage]}>{c.coverage}</td>
              <td>{c.situation.replace(' & ', ' tentative · ')}</td>
              <td>{c.n}</td>
              <td>{c.yards_per_play.toFixed(1)}</td>
              <td>{pct(c.first_down_rate)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </article>
  )
}
