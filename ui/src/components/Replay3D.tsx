import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useMemo, useRef, useState } from 'react'
import { Vector3 } from 'three'
import type { PlayData } from '../api'
import type { Focus } from './FieldCanvas'

const FIELD_WIDTH = 53.3

// Repère : x terrain → axe X, y terrain → axe −Z, hauteur → Y. Le tracking est 2D : la
// hauteur des avatars est fixe et ne représente aucune donnée (VISUALISATIONS.md).
const toWorld = (x: number, y: number, h = 0) => new Vector3(x, h, -(y - FIELD_WIDTH / 2))

type View = 'ol' | 'qb' | 'all22'
const VIEWS: Record<View, string> = { ol: 'Derrière la ligne', qb: 'Vue du QB', all22: 'All-22' }

function Camera({ play, frame, view }: { play: PlayData; frame: number; view: View }) {
  const { camera } = useThree()
  const target = useRef(new Vector3())
  useFrame(() => {
    const ball = play.positions.ball?.[frame] ?? [60, FIELD_WIDTH / 2]
    const qb = play.qbId !== null ? play.positions[String(play.qbId)]?.[frame] : undefined
    const look = toWorld(ball[0], ball[1])
    const eye =
      view === 'qb' && qb
        ? toWorld(qb[0] - 0.5, qb[1], 2)
        : view === 'ol'
          ? toWorld(ball[0] - 14, ball[1], 7)
          : toWorld(ball[0] - 2, ball[1] - 38, 28)
    if (view === 'qb' && qb) look.copy(toWorld(qb[0] + 10, qb[1], 1.2))
    camera.position.lerp(eye, 0.15)
    target.current.lerp(look, 0.15)
    camera.lookAt(target.current)
  })
  return null
}

function Players({ play, frame, focus }: { play: PlayData; frame: number; focus: Focus | null }) {
  const offense = play.meta.possessionTeam
  const focusIds = new Set(focus ? [focus.blockerId, focus.rusherId, play.qbId].map(String) : [])
  return (
    <>
      {play.players.map((p) => {
        const pos = play.positions[p.id]?.[frame]
        if (!pos) return null
        if (p.id === 'ball') {
          return (
            <mesh key="ball" position={toWorld(pos[0], pos[1], 0.6)}>
              <sphereGeometry args={[0.35, 12, 12]} />
              <meshStandardMaterial color="#a16207" />
            </mesh>
          )
        }
        const color = p.team === offense ? '#3b82f6' : '#f59e0b'
        const dim = focusIds.size > 0 && !focusIds.has(p.id)
        return (
          <mesh key={p.id} position={toWorld(pos[0], pos[1], 1)} rotation={[0, ((pos[2] ?? 0) * Math.PI) / 180, 0]}>
            <capsuleGeometry args={[0.45, 1.1, 4, 12]} />
            <meshStandardMaterial color={color} transparent opacity={dim ? 0.35 : 1} />
          </mesh>
        )
      })}
    </>
  )
}

function Field({ losX }: { losX: number }) {
  const lines = useMemo(() => Array.from({ length: 21 }, (_, k) => 10 + k * 5), [])
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[60, 0, 0]}>
        <planeGeometry args={[120, FIELD_WIDTH]} />
        <meshStandardMaterial color="#123018" />
      </mesh>
      {lines.map((x) => (
        <mesh key={x} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.01, 0]}>
          <planeGeometry args={[0.15, FIELD_WIDTH]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.35} />
        </mesh>
      ))}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[losX, 0.02, 0]}>
        <planeGeometry args={[0.2, FIELD_WIDTH]} />
        <meshBasicMaterial color="#60a5fa" />
      </mesh>
    </>
  )
}

/** C10 : replay 3D à caméras choisies (vue de la ligne, du QB, All-22). Optionnel : la 2D reste la vue par défaut. */
export function Replay3D({ play, frameIndex, focus }: { play: PlayData; frameIndex: number; focus: Focus | null }) {
  const [view, setView] = useState<View>('ol')
  const [ok] = useState(() => {
    const c = document.createElement('canvas')
    return Boolean(c.getContext('webgl2') || c.getContext('webgl'))
  })
  const snap = Math.max(0, play.frames.findIndex((f) => f.t === 0))
  const losX = play.positions.ball?.[snap]?.[0] ?? 60
  if (!ok) return <p className="muted">WebGL indisponible sur cet appareil : utiliser la vue 2D.</p>
  return (
    <div className="replay3d">
      <div className="toolbar">
        {(Object.keys(VIEWS) as View[]).map((v) => (
          <button key={v} type="button" className={`chip${view === v ? ' chip--on' : ''}`} aria-pressed={view === v} onClick={() => setView(v)}>
            {VIEWS[v]}
          </button>
        ))}
      </div>
      <Canvas camera={{ fov: 50, position: [losX - 14, 7, 0] }} style={{ height: 420, borderRadius: 8 }}>
        <color attach="background" args={['#05070d']} />
        <fog attach="fog" args={['#05070d', 60, 140]} />
        <ambientLight intensity={0.6} />
        <directionalLight position={[40, 60, 20]} intensity={1.1} />
        <Field losX={losX} />
        <Players play={play} frame={frameIndex} focus={focus} />
        <Camera play={play} frame={frameIndex} view={view} />
      </Canvas>
      <p className="legend">
        <span className="legend__swatch" style={{ background: '#3b82f6' }} /> Attaque ·{' '}
        <span className="legend__swatch" style={{ background: '#f59e0b' }} /> Défense · duel en pleine
        couleur. Les capteurs mesurent seulement la position au sol : la taille des joueurs est indicative.
      </p>
    </div>
  )
}
