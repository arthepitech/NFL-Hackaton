import { axisBottom, axisLeft, line, max, min, pointer, scaleLinear, select } from 'd3'
import { useEffect, useMemo, useRef } from 'react'
import type { DuelData, DuelPoint } from '../api'
import { YDS_TO_MPH } from '../format'

interface Props {
  duel: DuelData
  cursorT: number
  radius: number
  onSeek: (t: number) => void
}

const PANELS: { key: keyof DuelPoint; label: string; scale?: number; ref?: 'radius' }[] = [
  { key: 'd_qb', label: 'Distance rusher → QB (yd)', ref: 'radius' },
  { key: 'rusher_s', label: 'Vitesse du rusher (mph)', scale: YDS_TO_MPH },
  { key: 'depth_gap', label: 'Profondeur bloqueur − QB (yd)' },
  { key: 'shoulder_angle', label: 'Angle épaules bloqueur / course rusher (°)' },
]

const WIDTH = 720
const PANEL_H = 90
const MARGIN = { top: 22, right: 16, bottom: 26, left: 48 }
const HEIGHT = MARGIN.top + PANELS.length * (PANEL_H + 24) + MARGIN.bottom

const MARKERS: Record<string, { label: string; color: string }> = {
  snap: { label: 'Snap', color: '#9aa4b1' },
  pass_forward: { label: 'Passe', color: '#60a5fa' },
  autoevent_passforward: { label: 'Passe', color: '#60a5fa' },
  qb_sack: { label: 'Sack', color: '#e5484d' },
  qb_strip_sack: { label: 'Strip sack', color: '#e5484d' },
  defeat: { label: 'Défaite', color: '#f59e0b' },
  pressure: { label: 'Pression', color: '#e8ecf1' },
}

/** Timeline du duel (C3) : courbes synchronisées sur le même curseur que le terrain. */
export function DuelTimeline({ duel, cursorT, radius, onSeek }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const x = useMemo(() => {
    const ts = duel.series.map((p) => p.t)
    return scaleLinear()
      .domain([min(ts) ?? 0, max(ts) ?? 1])
      .range([MARGIN.left, WIDTH - MARGIN.right])
  }, [duel])

  useEffect(() => {
    const svg = select(svgRef.current)
    svg.selectAll('*').remove()
    PANELS.forEach((panel, i) => {
      const top = MARGIN.top + i * (PANEL_H + 24)
      const values = duel.series.map((p) => (p[panel.key] as number) * (panel.scale ?? 1))
      const y = scaleLinear()
        .domain([Math.min(0, min(values) ?? 0), max(values) ?? 1])
        .nice()
        .range([top + PANEL_H, top])
      const g = svg.append('g')
      g.append('text')
        .attr('x', MARGIN.left)
        .attr('y', top - 6)
        .attr('class', 'timeline__title')
        .text(panel.label)
      g.append('g')
        .attr('transform', `translate(${MARGIN.left},0)`)
        .call(axisLeft(y).ticks(3))
        .attr('class', 'timeline__axis')
      if (i === PANELS.length - 1) {
        g.append('g')
          .attr('transform', `translate(0,${top + PANEL_H})`)
          .call(axisBottom(x).ticks(8).tickFormat((d) => `${d} s`))
          .attr('class', 'timeline__axis')
      }
      if (panel.ref === 'radius') {
        g.append('line')
          .attr('x1', MARGIN.left)
          .attr('x2', WIDTH - MARGIN.right)
          .attr('y1', y(radius))
          .attr('y2', y(radius))
          .attr('class', 'timeline__ref')
      }
      g.append('path')
        .datum(duel.series)
        .attr('class', 'timeline__line')
        .attr(
          'd',
          line<DuelPoint>()
            .x((p) => x(p.t))
            .y((p) => y((p[panel.key] as number) * (panel.scale ?? 1))),
        )
      const shown = Object.entries(duel.markers)
        .filter(([name, t]) => MARKERS[name] && t !== null)
        .sort((a, b) => (a[1] as number) - (b[1] as number))
      shown.forEach(([name, value], k) => {
        const m = MARKERS[name]
        const t = value as number
        g.append('line')
          .attr('x1', x(t))
          .attr('x2', x(t))
          .attr('y1', top)
          .attr('y2', top + PANEL_H)
          .attr('stroke', m.color)
          .attr('stroke-dasharray', '4 3')
        if (i === 0) {
          // Étiquettes en escalier pour éviter les chevauchements (sack et pression proches).
          g.append('text')
            .attr('x', x(t) + 3)
            .attr('y', top + 12 + (k % 3) * 13)
            .attr('fill', m.color)
            .attr('class', 'timeline__marker')
            .text(`${m.label} ${t.toFixed(1)} s`)
        }
      })
    })
    svg
      .append('line')
      .attr('class', 'timeline__cursor')
      .attr('y1', MARGIN.top)
      .attr('y2', HEIGHT - MARGIN.bottom)
    svg
      .append('rect')
      .attr('x', MARGIN.left)
      .attr('y', 0)
      .attr('width', WIDTH - MARGIN.left - MARGIN.right)
      .attr('height', HEIGHT)
      .attr('fill', 'transparent')
      .on('click', (event) => onSeek(Math.round(x.invert(pointer(event)[0]) * 10) / 10))
  }, [duel, radius, x, onSeek])

  useEffect(() => {
    select(svgRef.current).select('.timeline__cursor').attr('x1', x(cursorT)).attr('x2', x(cursorT))
  }, [cursorT, x, duel])

  return (
    <svg
      ref={svgRef}
      className="timeline"
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      role="img"
      aria-label="Timeline du duel"
    />
  )
}
