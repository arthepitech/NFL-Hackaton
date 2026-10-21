import { useCallback, useEffect, useMemo, useState } from 'react'
import { api } from '../api'
import type { DuelData, PlayData } from '../api'
import { BLOCK_TYPES, downDistance } from '../format'
import { DuelTimeline } from './DuelTimeline'
import { AddToPlaylist } from './AddToPlaylist'
import { DiagnosisPanel } from './DiagnosisPanel'
import { FieldCanvas, type Focus } from './FieldCanvas'
import { Replay3D } from './Replay3D'
import { VideoSync } from './VideoSync'
import type { OpenPlay } from './PlayList'
import { SearchSelect } from './SearchSelect'

const SPEEDS = [0.25, 0.5, 1]
const FPS = 10 // fréquence du tracking (CLAUDE.md §7 : 10 images/s minimum)

interface Props {
  target: OpenPlay | null
  radius: number
  /** Lecture enchaînée d'une playlist (J5). */
  remaining?: number
  onNext?: () => void
}

export function PlayLab({ target, radius, remaining = 0, onNext }: Props) {
  const [play, setPlay] = useState<PlayData | null>(null)
  const [duel, setDuel] = useState<DuelData | null>(null)
  const [focus, setFocus] = useState<Focus | null>(null)
  const [frame, setFrame] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [threeD, setThreeD] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!target) return
    api.play(target.gameId, target.playId).then(
      (p) => {
        setPlay(p)
        const block = p.blocks.find((b) => b.blockerId === target.blockerId)
        setFocus({ blockerId: target.blockerId, rusherId: target.rusherId ?? block?.rusherId ?? null })
        const t = target.t ?? 0
        const idx = p.frames.findIndex((f) => f.t >= t - 1e-6)
        setFrame(idx >= 0 ? idx : 0)
        setError(null)
      },
      (e: Error) => setError(e.message),
    )
  }, [target])

  useEffect(() => {
    if (!play || !focus || focus.rusherId === null) return
    api
      .duel(Number(play.meta.gameId), Number(play.meta.playId), focus.blockerId, focus.rusherId)
      .then(setDuel, () => setDuel(null))
  }, [play, focus])

  const last = play ? play.frames.length - 1 : 0
  useEffect(() => {
    if (!playing) return
    const id = window.setInterval(() => {
      setFrame((f) => {
        if (f >= last) {
          setPlaying(false)
          return f
        }
        return f + 1
      })
    }, 1000 / (FPS * speed))
    return () => window.clearInterval(id)
  }, [playing, speed, last])

  const cursorT = play?.frames[frame]?.t ?? 0
  const seek = useCallback(
    (t: number) => {
      if (!play) return
      const idx = play.frames.findIndex((f) => f.t >= t - 1e-6)
      setFrame(idx >= 0 ? idx : last)
    },
    [play, last],
  )
  const names = useMemo(
    () => new Map(play?.players.map((p) => [p.id, `${p.name} (${p.jersey ?? '–'})`]) ?? []),
    [play],
  )

  if (!target) {
    return (
      <p className="muted">
        Choisissez une action depuis la fiche d’un joueur (un chiffre ou une défaite) pour la revoir ici.
      </p>
    )
  }
  if (error) return <p className="error">Jeu indisponible : {error}</p>
  if (!play) return <p className="muted">Chargement du jeu…</p>

  const m = play.meta
  const duelLabel = focus
    ? `${names.get(String(focus.blockerId)) ?? focus.blockerId} face à ${
        focus.rusherId ? names.get(String(focus.rusherId)) : 'personne'
      }`
    : ''
  return (
    <div className="playlab">
      <header className="playlab__header">
        <h2>
          Q{m.quarter} {m.gameClock} · {downDistance(Number(m.down), Number(m.yardsToGo))} ·{' '}
          {m.possessionTeam} contre {m.defensiveTeam}
        </h2>
        <p className="muted">{m.playDescription}</p>
        <SearchSelect
          label="Duel à suivre"
          value={focus ? `${focus.blockerId}-${focus.rusherId}` : ''}
          options={play.blocks.map((b) => ({
            value: `${b.blockerId}-${b.rusherId}`,
            label: `${names.get(String(b.blockerId))} → ${names.get(String(b.rusherId))}`,
            hint: BLOCK_TYPES[b.blockType ?? ''] ?? undefined,
          }))}
          onChange={(v) => {
            const [b, r] = v.split('-').map(Number)
            setFocus({ blockerId: b, rusherId: r })
          }}
        />
      </header>

      <div className="controls" role="toolbar" aria-label="Lecture">
        <button type="button" onClick={() => setFrame((f) => Math.max(0, f - 1))}>
          −0,1 s
        </button>
        <button type="button" className="controls__play" onClick={() => setPlaying((p) => !p)}>
          {playing ? 'Pause' : 'Lecture'}
        </button>
        <button type="button" onClick={() => setFrame((f) => Math.min(last, f + 1))}>
          +0,1 s
        </button>
        {SPEEDS.map((s) => (
          <button
            key={s}
            type="button"
            aria-pressed={speed === s}
            className={speed === s ? 'chip chip--on' : 'chip'}
            onClick={() => setSpeed(s)}
          >
            ×{s}
          </button>
        ))}
        {duel?.markers.defeat != null && (
          <button type="button" onClick={() => seek(duel.markers.defeat as number)}>
            Aller au moment de la défaite
          </button>
        )}
        <input
          type="range"
          min={0}
          max={last}
          value={frame}
          aria-label="Position dans le jeu"
          onChange={(e) => setFrame(Number(e.target.value))}
        />
        <span className="controls__time">t = {cursorT.toFixed(1)} s</span>
        {remaining > 0 && onNext && (
          <button type="button" className="chip chip--on" onClick={onNext}>
            Clip suivant ({remaining})
          </button>
        )}
      </div>

      <div className="playlab__grid">
        <div>
          <div className="toolbar">
            <button type="button" className={`chip${!threeD ? ' chip--on' : ''}`} aria-pressed={!threeD} onClick={() => setThreeD(false)}>
              Vue 2D
            </button>
            <button type="button" className={`chip${threeD ? ' chip--on' : ''}`} aria-pressed={threeD} onClick={() => setThreeD(true)}>
              Replay 3D
            </button>
          </div>
          {threeD ? (
            <Replay3D play={play} frameIndex={frame} focus={focus} />
          ) : (
            <FieldCanvas play={play} frameIndex={frame} focus={focus} radius={radius} />
          )}
        </div>
        <div className="playlab__side">
          <VideoSync
            gameId={Number(m.gameId)}
            playId={Number(m.playId)}
            duel={duel}
            cursorT={cursorT}
            playing={playing}
            label={duelLabel}
          />
          {duel && focus?.rusherId != null ? (
            <DuelTimeline duel={duel} cursorT={cursorT} radius={radius} onSeek={seek} />
          ) : (
            <p className="muted">Pas de défenseur attribué à ce bloqueur sur cette action : courbes indisponibles.</p>
          )}
        </div>
      </div>
      {focus && (
        <div className="two-cols">
          <DiagnosisPanel gameId={Number(m.gameId)} playId={Number(m.playId)} blockerId={focus.blockerId} />
          <section className="panel">
            <h3>Playlist du joueur</h3>
            <AddToPlaylist
              gameId={Number(m.gameId)}
              playId={Number(m.playId)}
              nflId={focus.blockerId}
              t={cursorT}
            />
          </section>
        </div>
      )}
    </div>
  )
}
