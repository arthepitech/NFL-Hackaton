import { useEffect, useRef, useState } from 'react'
import { api } from '../api'
import type { Clip, DuelData } from '../api'
import { FakeVideo } from './FakeVideo'
import { SearchSelect } from './SearchSelect'

interface Props {
  gameId: number
  playId: number
  duel: DuelData | null
  cursorT: number
  playing: boolean
  label: string
}

/**
 * Synchronisation vidéo (décision 0005 §8) : le clip est calé sur le snap par `snap_offset_s`
 * et suit le curseur partagé (terrain, timeline). Sans clip, le lecteur factice reste affiché.
 */
export function VideoSync({ gameId, playId, duel, cursorT, playing, label }: Props) {
  const [clips, setClips] = useState<Clip[]>([])
  const [angle, setAngle] = useState<string>('All-22')
  const [form, setForm] = useState({ angle: 'All-22', url: '' })
  const video = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    api.clips(gameId, playId).then(setClips)
  }, [gameId, playId])

  const clip = clips.find((c) => c.angle === angle) ?? clips[0]

  useEffect(() => {
    const v = video.current
    if (!v || !clip) return
    const target = clip.snap_offset_s + cursorT
    // ±1 image du tracking (0,1 s) : on ne recale que si l'écart dépasse une demi-image.
    if (Math.abs(v.currentTime - target) > 0.05) v.currentTime = Math.max(0, target)
    if (playing && v.paused) void v.play().catch(() => {})
    if (!playing && !v.paused) v.pause()
  }, [clip, cursorT, playing])

  const calibrate = () => {
    const v = video.current
    if (!v || !clip) return
    // Le coach a arrêté la vidéo sur le snap : l'offset = temps courant − t du curseur.
    api.setClip(gameId, playId, { ...clip, snap_offset_s: Math.max(0, v.currentTime - cursorT) }).then(setClips)
  }

  return (
    <div className="videosync">
      {clip ? (
        <figure className="video">
          <video ref={video} src={clip.url} muted playsInline preload="auto" />
          <figcaption>
            {label} · {clip.angle} · snap à {clip.snap_offset_s.toFixed(1)} s dans le clip · t ={' '}
            {cursorT.toFixed(1)} s
          </figcaption>
          <div className="toolbar">
            {clips.map((c) => (
              <button
                key={c.angle}
                type="button"
                className={`chip${c.angle === clip.angle ? ' chip--on' : ''}`}
                onClick={() => setAngle(c.angle)}
              >
                {c.angle}
              </button>
            ))}
            <button type="button" className="chip" onClick={calibrate}>
              Caler sur le snap (vidéo arrêtée au snap, curseur à 0 s)
            </button>
          </div>
        </figure>
      ) : (
        <FakeVideo duel={duel} cursorT={cursorT} label={label} />
      )}
      <form
        className="toolbar"
        onSubmit={(e) => {
          e.preventDefault()
          if (!form.url.trim()) return
          api
            .setClip(gameId, playId, { angle: form.angle, url: form.url.trim(), snap_offset_s: 0 })
            .then(setClips)
        }}
      >
        <SearchSelect
          label="Angle"
          value={form.angle}
          options={[
            { value: 'All-22', label: 'All-22 (vue large)' },
            { value: 'End zone', label: 'End zone (vue de face)' },
          ]}
          onChange={(v) => setForm({ ...form, angle: v })}
        />
        <label className="filters__select">
          <span className="filters__label">Clip du système vidéo (URL ou chemin)</span>
          <input
            className="text"
            value={form.url}
            onChange={(e) => setForm({ ...form, url: e.target.value })}
            placeholder="2021101709_1444_all22.mp4"
          />
        </label>
        <button type="submit" className="chip">
          Brancher le clip
        </button>
      </form>
    </div>
  )
}
