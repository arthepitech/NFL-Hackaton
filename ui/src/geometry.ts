import { polygonArea, polygonHull } from 'd3'
import type { PlayData } from './api'

export type Pt = [number, number]

/** Poche dynamique (C2) : enveloppe convexe des 5 OL et du QB à l'image i. */
export function pocketAt(play: PlayData, i: number): Pt[] | null {
  const ids = [...play.ol, play.qbId].filter((id): id is number => id !== null)
  const pts = ids.map((id) => play.positions[String(id)]?.[i]).filter(Boolean)
  if (pts.length < 3) return null
  return polygonHull(pts.map((p) => [p[0], p[1]] as Pt))
}

/** Surface (yd²) de la poche à l'image i, null si indisponible. */
export function pocketArea(play: PlayData, i: number): number | null {
  const hull = pocketAt(play, i)
  return hull ? Math.abs(polygonArea(hull)) : null
}

/** Surface maximale atteinte entre le snap et la fin du dropback : référence du rétrécissement. */
export function maxPocketArea(play: PlayData): number | null {
  let best: number | null = null
  play.frames.forEach((f, i) => {
    if (f.t < 0 || f.frameId > play.frame_end) return
    const a = pocketArea(play, i)
    if (a !== null && (best === null || a > best)) best = a
  })
  return best
}

/** Lien direct partageable : ?vue=playlab&joueur=…&match=…&jeu=…&bloqueur=…&rusher=…&t=… */
export function readDeepLink(search: string) {
  const q = new URLSearchParams(search)
  const num = (k: string) => (q.get(k) === null ? null : Number(q.get(k)))
  const game = num('match')
  const play = num('jeu')
  const blocker = num('bloqueur')
  return {
    view: q.get('vue'),
    playerId: num('joueur'),
    target:
      game !== null && play !== null && blocker !== null
        ? { gameId: game, playId: play, blockerId: blocker, rusherId: num('rusher'), t: num('t') }
        : null,
  }
}
