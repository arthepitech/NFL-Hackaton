import { useEffect, useState } from 'react'
import { api } from '../api'
import type { Filters, Meta, MetricKey, PlayerSummary, ScoutCardData, SnapRow } from '../api'
import { heightLabel } from '../format'
import { MetricTile } from './MetricTile'
import { PlayList, type OpenPlay } from './PlayList'

const ORDER: MetricKey[] = ['pbwr_pff', 'pbwr_tracking', 'ttp', 'pressure_rate', 'time_to_throw']
const COUNTED: Record<MetricKey, string> = {
  pbwr_pff: 'Bloc perdu (PFF)',
  pbwr_tracking: 'Bloc perdu (tracking)',
  ttp: 'Pression',
  pressure_rate: 'Pression concédée',
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

  useEffect(() => {
    if (playerId === null) return
    api.scoutCard(playerId, filters).then(setCard, (e: Error) => setError(e.message))
  }, [playerId, filters])

  useEffect(() => {
    if (playerId === null) return
    api.defeats(playerId, filters, confirmedOnly).then(setDefeats, (e: Error) => setError(e.message))
  }, [playerId, filters, confirmedOnly])

  useEffect(() => {
    if (playerId === null || metric === null) return
    api.plays(playerId, metric, filters).then(setMetricRows, (e: Error) => setError(e.message))
  }, [playerId, metric, filters])

  const minSnaps = meta.thresholds.min_snaps_display
  return (
    <div className="scout">
      <label className="picker">
        <span className="filters__label">Joueur OL</span>
        <select
          value={playerId ?? ''}
          onChange={(e) => {
            setMetric(null)
            onPlayer(Number(e.target.value))
          }}
        >
          <option value="" disabled>
            Choisir un joueur…
          </option>
          {players.map((p) => (
            <option key={p.nflId} value={p.nflId}>
              {p.name} · {p.position} · {p.team} ({p.snaps} snaps)
            </option>
          ))}
        </select>
      </label>
      {error && <p className="error">Erreur : {error}</p>}
      {card && playerId !== null && (
        <>
          <header className="scout__header">
            <h2>{card.player.name}</h2>
            <p>
              {card.player.position} · aligné surtout {card.player.alignment ?? '—'} ·{' '}
              {card.player.team ?? '—'} · {heightLabel(card.player.height_in)},{' '}
              {card.player.weight} lbs · {card.player.age ?? '—'} ans ·{' '}
              {card.player.college ?? 'université inconnue'}
            </p>
          </header>
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
            <span className="legend__swatch legend__swatch--top" /> Top 10 % des OL ·{' '}
            <span className="legend__swatch legend__swatch--bottom" /> Bottom 10 % · neutre sinon.
            Comparaison aux OL ayant au moins {minSnaps} snaps sous les mêmes filtres ; chiffre
            grisé sous {minSnaps} snaps.
          </p>
          <div className="scout__lists">
            {metric && (
              <PlayList
                title={`Jeux du chiffre « ${meta.definitions[metric].label} »`}
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
                Seulement les défaites confirmées par PFF
              </label>
              <PlayList
                title="Défaites, de la plus rapide à la plus lente"
                rows={defeats}
                nflId={playerId}
                countedLabel="Confirmée PFF"
                onOpen={onOpenPlay}
              />
            </div>
          </div>
        </>
      )}
    </div>
  )
}
