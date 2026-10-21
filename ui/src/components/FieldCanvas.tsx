import { interpolateRgb } from 'd3'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { PlayData } from '../api'
import { maxPocketArea, pocketArea, pocketAt, type Pt } from '../geometry'

const FIELD_WIDTH = 53.3
const BEHIND = 14 // yards montrés derrière la ligne de mêlée
const AHEAD = 12

const COLORS = {
  team: '#3b82f6',
  opponent: '#f59e0b',
  context: '#6b7280',
  ball: '#a16207',
  pocketGood: '#3b82f6',
  pocketBad: '#e5484d',
  pressure: '#e8ecf1',
}

export interface Focus {
  blockerId: number
  rusherId: number | null
}

interface Props {
  play: PlayData
  frameIndex: number
  focus: Focus | null
  radius: number
}

export function FieldCanvas({ play, frameIndex, focus, radius }: Props) {
  const wrap = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const [width, setWidth] = useState(800)

  useEffect(() => {
    const el = wrap.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const snapIndex = Math.max(0, play.frames.findIndex((f) => f.t === 0))
  const losX = play.positions.ball?.[snapIndex]?.[0] ?? 60
  const height = (width * (BEHIND + AHEAD)) / FIELD_WIDTH
  const scale = width / FIELD_WIDTH
  const maxArea = useMemo(() => maxPocketArea(play), [play])
  const hull = pocketAt(play, frameIndex)
  const area = pocketArea(play, frameIndex)
  const ratio = area !== null && maxArea ? Math.min(1, area / maxArea) : null

  useEffect(() => {
    const ctx = canvas.current?.getContext('2d')
    if (!ctx) return
    const dpr = window.devicePixelRatio || 1
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    // Attaque vers le haut : x terrain → vertical, y terrain → horizontal (gauche = +y).
    const px = (x: number, y: number): Pt => [(FIELD_WIDTH - y) * scale, (losX + AHEAD - x) * scale]

    ctx.fillStyle = '#123018'
    ctx.fillRect(0, 0, width, height)
    ctx.strokeStyle = 'rgba(255,255,255,0.25)'
    ctx.fillStyle = 'rgba(255,255,255,0.5)'
    ctx.font = '14px system-ui'
    ctx.lineWidth = 1
    for (let x = Math.ceil((losX - BEHIND) / 5) * 5; x <= losX + AHEAD; x += 5) {
      const [, y] = px(x, 0)
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(width, y)
      ctx.stroke()
      const yardLine = Math.round(x - 10)
      if (yardLine > 0 && yardLine < 100 && yardLine % 10 === 0) {
        ctx.fillText(String(yardLine <= 50 ? yardLine : 100 - yardLine), 6, y - 4)
      }
    }
    const [, losY] = px(losX, 0)
    ctx.strokeStyle = 'rgba(96,165,250,0.8)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(0, losY)
    ctx.lineTo(width, losY)
    ctx.stroke()

    if (hull && ratio !== null) {
      ctx.beginPath()
      hull.forEach(([x, y], k) => (k ? ctx.lineTo(...px(x, y)) : ctx.moveTo(...px(x, y))))
      ctx.closePath()
      const color = interpolateRgb(COLORS.pocketBad, COLORS.pocketGood)(ratio)
      ctx.fillStyle = color.replace('rgb', 'rgba').replace(')', ', 0.25)')
      ctx.fill()
      ctx.strokeStyle = color
      ctx.lineWidth = 2
      ctx.stroke()
    }

    const qb = play.qbId !== null ? play.positions[String(play.qbId)]?.[frameIndex] : undefined
    if (qb) {
      const [cx, cy] = px(qb[0], qb[1])
      ctx.beginPath()
      ctx.arc(cx, cy, radius * scale, 0, Math.PI * 2)
      ctx.setLineDash([6, 4])
      ctx.strokeStyle = COLORS.pressure
      ctx.lineWidth = 2
      ctx.stroke()
      ctx.setLineDash([])
    }

    const focusIds = new Set(
      focus ? [focus.blockerId, focus.rusherId, play.qbId].filter(Boolean).map(String) : []
    )
    if (focus) {
      for (const id of [focus.blockerId, focus.rusherId]) {
        const path = id === null ? undefined : play.positions[String(id)]
        if (!path) continue
        ctx.beginPath()
        path.slice(snapIndex, frameIndex + 1).forEach(([x, y], k) => {
          const p = px(x, y)
          if (k) ctx.lineTo(...p)
          else ctx.moveTo(...p)
        })
        ctx.strokeStyle = id === focus.blockerId ? COLORS.team : COLORS.opponent
        ctx.lineWidth = 2
        ctx.stroke()
      }
    }

    const offense = play.meta.possessionTeam
    for (const p of play.players) {
      const pos = play.positions[p.id]?.[frameIndex]
      if (!pos) continue
      const [cx, cy] = px(pos[0], pos[1])
      const isBall = p.id === 'ball'
      const highlighted = focusIds.size === 0 || focusIds.has(p.id) || isBall
      ctx.globalAlpha = highlighted ? 1 : 0.3
      const color = isBall ? COLORS.ball : p.team === offense ? COLORS.team : COLORS.opponent
      const r = isBall ? 0.35 * scale : (focusIds.has(p.id) ? 0.75 : 0.6) * scale
      ctx.beginPath()
      ctx.arc(cx, cy, r, 0, Math.PI * 2)
      ctx.fillStyle = color
      ctx.fill()
      if (!isBall && pos[2] !== null) {
        // o : 0° = +y, sens horaire (convention NGS) → vecteur (sin o, cos o) en (x, y).
        const rad = (pos[2] * Math.PI) / 180
        const [ex, ey] = px(pos[0] + Math.sin(rad) * 1.1, pos[1] + Math.cos(rad) * 1.1)
        ctx.beginPath()
        ctx.moveTo(cx, cy)
        ctx.lineTo(ex, ey)
        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = 2
        ctx.stroke()
      }
      if (focusIds.has(p.id) && p.jersey !== null) {
        ctx.fillStyle = '#0f1216'
        ctx.font = `bold ${Math.max(12, r)}px system-ui`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(String(p.jersey), cx, cy)
        ctx.textAlign = 'start'
        ctx.textBaseline = 'alphabetic'
      }
    }
    ctx.globalAlpha = 1
  }, [play, frameIndex, focus, radius, width, height, scale, losX, hull, ratio, snapIndex])

  const dpr = typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1
  return (
    <div ref={wrap} className="field">
      <canvas
        ref={canvas}
        width={width * dpr}
        height={height * dpr}
        style={{ width, height }}
        role="img"
        aria-label="Terrain vu de dessus, attaque vers le haut"
      />
      <p className="field__legend">
        <span className="legend__swatch" style={{ background: COLORS.team }} /> Attaque ·{' '}
        <span className="legend__swatch" style={{ background: COLORS.opponent }} /> Défense ·
        pointillés : {radius} yd autour du QB · poche{' '}
        {area !== null && ratio !== null
          ? `${area.toFixed(0)} yd² (${Math.round(ratio * 100)} % de sa surface maximale) : bleu = intacte, rouge = effondrée`
          : 'indisponible'}
      </p>
    </div>
  )
}
