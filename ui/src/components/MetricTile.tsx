import type { Definition, MetricKey, MetricValue } from '../api'
import { formatMetric } from '../format'

interface Props {
  metricKey: MetricKey
  metric: MetricValue
  definition: Definition
  selected: boolean
  onOpen: (key: MetricKey) => void
}

/** Un chiffre de la Scout Card : toujours cliquable, toujours avec son échantillon. */
export function MetricTile({ metricKey, metric, definition, selected, onOpen }: Props) {
  const classes = ['tile']
  if (metric.low_sample) classes.push('tile--low')
  if (metric.tier) classes.push(`tile--${metric.tier}`)
  if (selected) classes.push('tile--selected')
  return (
    <button
      type="button"
      className={classes.join(' ')}
      title={definition.definition}
      aria-label={`${definition.label} : ${formatMetric(metricKey, metric.value)}, ${metric.n} snaps. Voir les jeux.`}
      onClick={() => onOpen(metricKey)}
    >
      <span className="tile__label">{definition.label}</span>
      <span className="tile__value">{formatMetric(metricKey, metric.value)}</span>
      <span className="tile__n">
        {metric.n} snaps{metric.low_sample ? ' · échantillon faible' : ''}
      </span>
      {metric.tier && (
        <span className="tile__tier">{metric.tier === 'top' ? 'Top 10 %' : 'Bottom 10 %'}</span>
      )}
    </button>
  )
}
