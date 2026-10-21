import { useEffect, useRef } from 'react'
import type { DuelData } from '../api'

interface Props {
  duel: DuelData | null
  cursorT: number
  label: string
}

/**
 * J3 : clip + calque tracking. La vidéo du club n'est pas branchée : lecteur factice calé sur
 * le même curseur, avec la trajectoire du bloqueur (bleu) et du rusher (orange) dessinée par-dessus.
 */
export function FakeVideo({ duel, cursorT, label }: Props) {
  const ref = useRef<HTMLCanvasElement>(null)
  const W = 640
  const H = 360

  useEffect(() => {
    const ctx = ref.current?.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = '#05070a'
    ctx.fillRect(0, 0, W, H)
    ctx.fillStyle = '#6b7280'
    ctx.font = '18px system-ui'
    ctx.textAlign = 'center'
    ctx.fillText('Vidéo All-22 non branchée : lecteur factice', W / 2, H / 2)
    ctx.textAlign = 'start'
    if (!duel || duel.series.length === 0) return
    const pts = duel.series.filter((p) => p.t >= 0 && p.t <= cursorT)
    const all = duel.series.filter((p) => p.t >= 0)
    const xs = all.flatMap((p) => [p.blocker_x, p.rusher_x])
    const ys = all.flatMap((p) => [p.blocker_y, p.rusher_y])
    const [x0, x1] = [Math.min(...xs) - 2, Math.max(...xs) + 2]
    const [y0, y1] = [Math.min(...ys) - 2, Math.max(...ys) + 2]
    const s = Math.min(W / (y1 - y0), H / (x1 - x0))
    // Calque : attaque vers le haut, comme la vue end zone.
    const px = (x: number, y: number): [number, number] => [
      W / 2 + ((y0 + y1) / 2 - y) * s,
      H / 2 + ((x0 + x1) / 2 - x) * s,
    ]
    for (const [key, color] of [
      ['blocker', '#3b82f6'],
      ['rusher', '#f59e0b'],
    ] as const) {
      ctx.beginPath()
      pts.forEach((p, k) => {
        const [cx, cy] = px(p[`${key}_x`], p[`${key}_y`])
        if (k) ctx.lineTo(cx, cy)
        else ctx.moveTo(cx, cy)
      })
      ctx.strokeStyle = color
      ctx.lineWidth = 4
      ctx.stroke()
      const last = pts[pts.length - 1]
      if (last) {
        const [cx, cy] = px(last[`${key}_x`], last[`${key}_y`])
        ctx.beginPath()
        ctx.arc(cx, cy, 9, 0, Math.PI * 2)
        ctx.fillStyle = color
        ctx.fill()
      }
    }
  }, [duel, cursorT])

  return (
    <figure className="video">
      <canvas ref={ref} width={W} height={H} role="img" aria-label={`Clip factice : ${label}`} />
      <figcaption>
        {label} · t = {cursorT.toFixed(1)} s · bleu : bloqueur · orange : rusher
      </figcaption>
    </figure>
  )
}
