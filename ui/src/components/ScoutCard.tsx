import { useEffect, useState } from 'react'
import { api } from '../api'
import type { Filters, Meta, MetricKey, PlayerSummary, RadarData, ScoutCardData, SnapRow } from '../api'
import { heightLabel, positionLabel } from '../format'
import { MetricTile } from './MetricTile'
import { PathsView } from './PathsView'
import { RadarChart } from './RadarChart'
import { PlayList, type OpenPlay } from './PlayList'
import { SearchSelect } from './SearchSelect'

const ORDER: MetricKey[] = [
  'pbwr_pff',
  'pbwr_tracking',
  'island',
  'ttp',
  'pressure_rate',
  'time_to_throw',
]
const COUNTED: Record<MetricKey, string> = {
  pbwr_pff: 'Bloc perdu',
  pbwr_tracking: 'Bloc perdu (capteurs)',
  island: 'Bloc perdu sans aide',
  ttp: 'Pression',
  pressure_rate: 'Pression laissée passer',
  time_to_throw: 'Passe',
}

interface Props {
  meta: Meta
  players: PlayerSummary[]
  playerId: number | null
  onPlayer: (id: number) => void
  filters: Filters
  onOpenPlay: (p: OpenPlay) => void
}

export function ScoutCard({ meta, players, playerId, onPlayer, filters, onOpenPlay }: Props) {
  const [card, setCard] = useState<ScoutCardData | null>(null)
  const [metric, setMetric] = useState<MetricKey | null>(null)
  const [metricRows, setMetricRows] = useState<SnapRow[]>([])
  const [defeats, setDefeats] = useState<SnapRow[]>([])
  const [confirmedOnly, setConfirmedOnly] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [radar, setRadar] = useState<RadarData | null>(null)
  const [badges, setBadges] = useState<{ kind: 'top' | 'bottom'; label: string; n: number }[]>([])

  useEffect(() => {
    if (playerId === null) return
    api.scoutCard(playerId, filters).then(setCard, (e: Error) => setError(e.message))
  }, [playerId, filters])

  useEffect(() => {
    if (playerId === null) return
    api.defeats(playerId, filters, confirmedOnly).then(setDefeats, (e: Error) => setError(e.message))
  }, [playerId, filters, confirmedOnly])

  useEffect(() => {
    if (playerId !== null) api.badges(playerId).then(setBadges)
  }, [playerId])

  useEffect(() => {
    if (playerId === null) return
    api.radar([playerId], null, filters).then(setRadar, (e: Error) => setError(e.message))
  }, [playerId, filters])

  useEffect(() => {
    if (playerId === null || metric === null) return
    api.plays(playerId, metric, filters).then(setMetricRows, (e: Error) => setError(e.message))
  }, [playerId, metric, filters])

  const minSnaps = meta.thresholds.min_snaps_display
  return (
    <div className="scout">
      <SearchSelect
        label="Joueur de ligne offensive"
        value={playerId === null ? '' : String(playerId)}
        placeholder="Tapez un nom ou une équipe…"
        options={players.map((p) => ({ value: String(p.nflId), label: p.name, hint: `${p.team} · ${p.snaps} actions` }))}
        onChange={(v) => {
          setMetric(null)
          onPlayer(Number(v))
        }}
      />
      {error && <p className="error">Erreur : {error}</p>}
      {card && playerId !== null && (
        <>
          <header className="scout__header">
            <h2>{card.player.name}</h2>
            <p>
              {positionLabel(card.player.position)}, joue surtout {positionLabel(card.player.alignment)} ·{' '}
              {card.player.team ?? '—'} · {heightLabel(card.player.height_in)},{' '}
              {card.player.weight} lbs · {card.player.age ?? '—'} ans ·{' '}
              {card.player.college ?? 'université inconnue'}
            </p>
          </header>
          {badges.length > 0 && (
            <div className="toolbar" aria-label="Badges (saison)">
              {badges.map((b) => (
                <span key={b.label} className={`badge badge--${b.kind}`}>
                  {b.label} · {b.n} actions
                </span>
              ))}
            </div>
          )}
          {card.alerts.map((a) => (
            <p className="alert" key={a.kind} role="status">
              ⚠ {a.message}
            </p>
          ))}
          <div className="tiles">
            {ORDER.map((k) => (
              <MetricTile
                key={k}
                metricKey={k}
                metric={card.metrics[k]}
                definition={meta.definitions[k]}
                selected={metric === k}
                onOpen={setMetric}
              />
            ))}
          </div>
          <p className="legend">
            <span className="legend__swatch legend__swatch--top" /> Parmi les 10 % meilleurs ·{' '}
            <span className="legend__swatch legend__swatch--bottom" /> Parmi les 10 % moins bons ·
            comparé aux joueurs de ligne ayant au moins {minSnaps} actions dans la même situation ;
            chiffre grisé sous {minSnaps} actions.
          </p>
          <div className="two-cols">
            {radar && (
              <section className="panel">
                <h3>Ses blocs réussis selon la situation, comparés à la moyenne du poste</h3>
                <RadarChart data={radar} minSnaps={minSnaps} />
              </section>
            )}
            <PathsView playerId={playerId} filters={filters} onOpenPlay={onOpenPlay} />
          </div>
          <div className="scout__lists">
            {metric && (
              <PlayList
                title={`Les actions derrière « ${meta.definitions[metric].label} »`}
                rows={metricRows}
                nflId={playerId}
                countedLabel={COUNTED[metric]}
                onOpen={onOpenPlay}
                jumpTo={metric === 'ttp' ? 'ttp' : 'defeat_t'}
              />
            )}
            <div>
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={confirmedOnly}
                  onChange={(e) => setConfirmedOnly(e.target.checked)}
                />
                Seulement les défaites confirmées par les analystes vidéo
              </label>
              <PlayList
                title="Ses défaites, de la plus rapide à la plus lente"
                rows={defeats}
                nflId={playerId}
                countedLabel="Confirmée en vidéo"
                onOpen={onOpenPlay}
              />
            </div>
          </div>
        </>
      )}
    </div>
  )
}
