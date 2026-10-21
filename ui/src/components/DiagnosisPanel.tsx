import { useEffect, useState } from 'react'
import { api } from '../api'
import type { Diagnosis } from '../api'
import { causeLabel } from '../format'

interface Props {
  gameId: number
  playId: number
  blockerId: number
}

const fmt = (v: number | boolean | null) =>
  v === null
    ? '—'
    : typeof v === 'boolean'
      ? v
        ? 'oui'
        : 'non'
      : Number.isInteger(v)
        ? String(v)
        : v.toFixed(1)

/** Diagnostic assisté : une cause *probable*, que le coach confirme ou corrige en 1 clic. */
export function DiagnosisPanel({ gameId, playId, blockerId }: Props) {
  const [diag, setDiag] = useState<Diagnosis | null>(null)
  const [tags, setTags] = useState<string[]>([])
  const [custom, setCustom] = useState('')
  const [comment, setComment] = useState('')
  const [missing, setMissing] = useState(false)

  useEffect(() => {
    api.diagnosis(gameId, playId, blockerId).then(setDiag, () => setMissing(true))
    api.tags().then(setTags)
  }, [gameId, playId, blockerId])

  if (missing) return <p className="muted">Ce joueur ne protégeait pas sur cette action.</p>
  if (!diag) return null
  const save = (cause: string) =>
    api.tagDiagnosis(gameId, playId, blockerId, cause, comment).then((tag) => {
      setDiag({ ...diag, tag })
      if (!tags.includes(cause)) setTags([...tags, cause])
      setCustom('')
    })

  return (
    <section className="panel diag" aria-label="Diagnostic assisté">
      <h3>
        {diag.cause === null
          ? 'Pas de défaite sur cette action'
          : `Cause probable : ${causeLabel(diag.cause)}`}
      </h3>
      {diag.reason && <p>{diag.reason}</p>}
      <p className="muted">
        Hypothèse calculée automatiquement, jamais une certitude : à confirmer ou corriger.
      </p>
      <dl className="diag__features">
        {Object.entries(diag.features).map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{fmt(v)}</dd>
          </div>
        ))}
      </dl>
      {diag.cause !== null && (
        <>
          {diag.tag && (
            <p className="diag__tag" role="status">
              {diag.tag.confirmed ? 'Confirmé' : 'Corrigé'} par {diag.tag.author} :{' '}
              <strong>{causeLabel(diag.tag.cause)}</strong>
              {diag.tag.comment ? ` · « ${diag.tag.comment} »` : ''}
            </p>
          )}
          <label className="filters__select">
            <span className="filters__label">Commentaire (facultatif)</span>
            <input value={comment} onChange={(e) => setComment(e.target.value)} className="text" />
          </label>
          <div className="toolbar">
            <button type="button" className="chip chip--on" onClick={() => save(diag.cause as string)}>
              Confirmer « {causeLabel(diag.cause as string)} »
            </button>
            {tags
              .filter((t) => t !== diag.cause)
              .map((t) => (
                <button key={t} type="button" className="chip" onClick={() => save(t)}>
                  Plutôt : {causeLabel(t)}
                </button>
              ))}
          </div>
          <form
            className="toolbar"
            onSubmit={(e) => {
              e.preventDefault()
              if (custom.trim()) save(custom.trim())
            }}
          >
            <label className="filters__select">
              <span className="filters__label">Autre cause (réutilisable ensuite)</span>
              <input value={custom} onChange={(e) => setCustom(e.target.value)} className="text" />
            </label>
            <button type="submit" className="chip">
              Enregistrer
            </button>
          </form>
          <details>
            <summary>Comment c’est calculé</summary>
            <ul>
              {Object.entries(diag.rules).map(([k, v]) => (
                <li key={k}>
                  <strong>{k}</strong> : {v}
                </li>
              ))}
            </ul>
          </details>
        </>
      )}
    </section>
  )
}
