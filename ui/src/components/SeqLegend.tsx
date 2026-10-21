interface LegendProps {
  label: string
  from: string
  to: string
  low: string
  high: string
}

/** Jamais de couleur sans légende (CLAUDE.md §7). */
export function SeqLegend({ label, from, to, low, high }: LegendProps) {
  return (
    <p className="seqlegend">
      <span>{label}</span>
      <span className="seqlegend__end">{low}</span>
      <span className="seqlegend__bar" style={{ background: `linear-gradient(90deg, ${from}, ${to})` }} />
      <span className="seqlegend__end">{high}</span>
    </p>
  )
}
