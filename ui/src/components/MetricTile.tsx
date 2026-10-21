import { useState } from 'react'
import type { Definition, MetricKey, MetricValue } from '../api'
import { actions, formatMetric } from '../format'

interface Props {
  metricKey: MetricKey
  metric: MetricValue
  definition: Definition
  selected: boolean
  onOpen: (key: MetricKey) => void
}

/** Un chiffre : toujours cliquable (liste des actions), toujours avec son échantillon et son aide. */
export function MetricTile({ metricKey, metric, definition, selected, onOpen }: Props) {
  const [help, setHelp] = useState(false)
  const classes = ['tile']
  if (metric.low_sample) classes.push('tile--low')
  if (metric.tier) classes.push(`tile--${metric.tier}`)
  if (selected) classes.push('tile--selected')
  return (
    <div className={classes.join(' ')}>
      <button
        type="button"
        className="tile__main"
        title={definition.definition}
        aria-label={`${definition.label} : ${formatMetric(metricKey, metric.value)}, sur ${actions(metric.n)}. Voir les actions.`}
        onClick={() => onOpen(metricKey)}
      >
        <span className="tile__label">{definition.label}</span>
        <span className="tile__value">{formatMetric(metricKey, metric.value)}</span>
        <span className="tile__n">
          sur {actions(metric.n)}
          {metric.low_sample ? ' · peu d’actions, à prendre avec prudence' : ''}
        </span>
        {metric.tier && (
          <span className="tile__tier">{metric.tier === 'top' ? 'Parmi les 10 % meilleurs' : 'Parmi les 10 % moins bons'}</span>
        )}
        <span className="tile__cta">Voir les actions →</span>
      </button>
      <button
        type="button"
        className="tile__help"
        aria-expanded={help}
        aria-label={`Qu’est-ce que « ${definition.label} » ?`}
        onClick={() => setHelp((h) => !h)}
      >
        ?
      </button>
      {help && <p className="tile__definition">{definition.definition}</p>}
    </div>
  )
}
