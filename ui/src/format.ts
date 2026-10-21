import type { MetricKey } from './api'

// Conversion d'unité à l'affichage uniquement (CLAUDE.md §4.2).
export const YDS_TO_MPH = 2.045

export const pct = (v: number | null) => (v === null ? '—' : `${(v * 100).toFixed(1)} %`)
export const secs = (v: number | null) => (v === null ? '—' : `${v.toFixed(1)} s`)
export const mph = (ydPerSec: number) => `${(ydPerSec * YDS_TO_MPH).toFixed(1)} mph`

export function formatMetric(key: MetricKey, v: number | null) {
  return key === 'ttp' || key === 'time_to_throw' ? secs(v) : pct(v)
}

// Vocabulaire football : jamais de nom de colonne brut à l'écran (CLAUDE.md §7).
export const BLOCK_TYPES: Record<string, string> = {
  PP: 'Protection standard',
  PA: 'Protection play action',
  SW: 'Switch',
  CH: 'Chip',
  PU: 'Pickup du backfield',
  BH: 'Aide du backfield',
  PT: 'Post',
  UP: 'Pull en protection',
  PR: 'Pocket roll',
  SR: 'Set & release',
  CL: 'Second niveau',
  NB: 'Pas de bloc',
}

export const FILTER_LABELS: Record<string, string> = {
  down: 'Down',
  distance: 'Distance',
  quarter: 'Quart-temps',
  score: 'Score',
  red_zone: 'Red zone',
  formation: 'Formation',
  personnel_o: 'Personnel off.',
  personnel_d: 'Personnel déf.',
  coverage: 'Couverture',
  play_action: 'Play action',
  dropback: 'Dropback',
  opponent: 'Adversaire',
  week_min: 'Semaine de',
  week_max: 'à',
}

export const OPTION_LABELS: Record<string, string> = {
  court: 'Court (≤ 3)',
  moyen: 'Moyen (4–6)',
  long: 'Long (≥ 7)',
  mene_9_plus: 'Mené de 9+',
  mene_1_8: 'Mené de 1 à 8',
  egalite: 'Égalité',
  devant_1_8: 'Devant de 1 à 8',
  devant_9_plus: 'Devant de 9+',
  TRADITIONAL: 'Dropback classique',
  SCRAMBLE: 'Scramble',
  DESIGNED_ROLLOUT_RIGHT: 'Rollout droite',
  DESIGNED_ROLLOUT_LEFT: 'Rollout gauche',
  SCRAMBLE_ROLLOUT_RIGHT: 'Scramble droite',
  SCRAMBLE_ROLLOUT_LEFT: 'Scramble gauche',
  DESIGNED_RUN: 'Course du QB',
  UNKNOWN: 'Inconnu',
  SHOTGUN: 'Shotgun',
  EMPTY: 'Empty',
  SINGLEBACK: 'Singleback',
  I_FORM: 'I-Formation',
  PISTOL: 'Pistol',
  JUMBO: 'Jumbo',
  WILDCAT: 'Wildcat',
  '5': 'Prolongation',
}

export const optionLabel = (key: string, v: string | number) =>
  key === 'quarter' && String(v) !== '5' ? `Q${v}` : (OPTION_LABELS[String(v)] ?? String(v))

export const downDistance = (down: number, togo: number) =>
  down === 0 ? '—' : `${down}${down === 1 ? 'st' : down === 2 ? 'nd' : down === 3 ? 'rd' : 'th'} & ${togo}`

export const heightLabel = (inches: number) => `${Math.floor(inches / 12)}'${inches % 12}"`
