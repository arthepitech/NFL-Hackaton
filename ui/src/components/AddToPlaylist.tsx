import { useEffect, useState } from 'react'
import { api } from '../api'
import type { Playlist } from '../api'
import { SearchSelect } from './SearchSelect'

interface Props {
  gameId: number
  playId: number
  nflId: number
  t: number
}

/** J5 côté coach : ajouter le jeu à la playlist du joueur, avec l'instant et un commentaire. */
export function AddToPlaylist({ gameId, playId, nflId, t }: Props) {
  const [lists, setLists] = useState<Playlist[]>([])
  const [target, setTarget] = useState<string>('')
  const [comment, setComment] = useState('')
  const [done, setDone] = useState<string | null>(null)

  useEffect(() => {
    api.playlists(nflId).then((l) => {
      setLists(l)
      if (l[0]) setTarget(String(l[0].id))
    })
  }, [nflId])

  const add = async () => {
    let id = Number(target)
    if (!target) id = (await api.createPlaylist('À revoir avant jeudi', nflId)).id
    await api.addItem(id, { gameId, playId, nflId, t, comment })
    setDone(`Ajouté à t = ${t.toFixed(1)} s`)
    setComment('')
    api.playlists(nflId).then(setLists)
    setTarget(String(id))
  }

  return (
    <div className="toolbar" aria-label="Ajouter à une playlist">
      <SearchSelect
        label="Playlist du joueur"
        value={target}
        emptyLabel="Nouvelle : « À revoir avant jeudi »"
        options={lists.map((l) => ({ value: String(l.id), label: l.name, hint: `${l.items.length} actions` }))}
        onChange={setTarget}
      />
      <label className="filters__select">
        <span className="filters__label">Commentaire du coach</span>
        <input className="text" value={comment} onChange={(e) => setComment(e.target.value)} />
      </label>
      <button type="button" className="chip" onClick={add}>
        Ajouter ce moment
      </button>
      {done && <span className="muted">{done}</span>}
    </div>
  )
}
