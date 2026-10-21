import { useEffect, useState } from 'react'
import { api } from '../../api'
import type { MetricValue, PlayerSummary, SnapRow, WeekRow } from '../../api'
import { PlayerCard } from '../PlayerCard'
import { PlayList, type OpenPlay } from '../PlayList'
import { PlayerPlaylists } from './PlayerPlaylists'
import { ProgressChart } from './ProgressChart'
import { SetCompare } from './SetCompare'

interface Props {
  playerId: number | null
  name: string
  tier: MetricValue['tier']
  minSnaps: number
  players: PlayerSummary[]
  onOpenPlay: (p: OpenPlay) => void
  onPlayQueue: (q: OpenPlay[]) => void
}

/** Vue joueur : J1 carte, J2 progression, J4 set comparé, J5 playlists. */
export function PlayerView(props: Props) {
  const { playerId, minSnaps, players, onOpenPlay, onPlayQueue } = props
  const [weeks, setWeeks] = useState<WeekRow[]>([])
  const [week, setWeek] = useState<number | null>(null)
  const [rows, setRows] = useState<SnapRow[]>([])

  useEffect(() => {
    if (playerId !== null) api.weekly(playerId).then(setWeeks)
  }, [playerId])

  useEffect(() => {
    if (playerId === null || week === null) return
    const w = String(week)
    api.plays(playerId, 'pbwr_pff', { week_min: w, week_max: w }).then(setRows)
  }, [playerId, week])

  if (playerId === null) return <PlayerCard {...props} />
  return (
    <div>
      <PlayerCard {...props} />
      <div className="two-cols">
        <ProgressChart weeks={weeks} minSnaps={minSnaps} onWeek={setWeek} />
        <PlayerPlaylists playerId={playerId} onPlayQueue={onPlayQueue} />
      </div>
      {week !== null && (
        <PlayList
          title={`Semaine ${week}`}
          rows={rows}
          nflId={playerId}
          countedLabel="Bloc perdu"
          onOpen={onOpenPlay}
        />
      )}
      <SetCompare playerId={playerId} players={players} />
    </div>
  )
}
