import type { Filters, MetricKey } from './api'

// Conversion d'unité à l'affichage uniquement (CLAUDE.md §4.2).
export const YDS_TO_MPH = 2.045

export const pct = (v: number | null) => (v === null ? '—' : `${Math.round(v * 100)} %`)
export const pct1 = (v: number | null) => (v === null ? '—' : `${(v * 100).toFixed(1)} %`)
export const secs = (v: number | null) => (v === null ? '—' : `${v.toFixed(1)} s`)
export const mph = (ydPerSec: number) => `${(ydPerSec * YDS_TO_MPH).toFixed(1)} mph`
export const actions = (n: number) => `${n} action${n > 1 ? 's' : ''}`

export function formatMetric(key: MetricKey, v: number | null) {
  return key === 'ttp' || key === 'time_to_throw' ? secs(v) : pct1(v)
}

// Français courant, terme football entre parenthèses (docs/plans/ux-simplification.md).
export const BLOCK_TYPES: Record<string, string> = {
  PP: 'Protection classique',
  PA: 'Protection sur feinte de course',
  SW: 'Échange de défenseurs (switch)',
  CH: 'Aide rapide avant sa course (chip)',
  PU: 'Prise en charge par le running back',
  BH: 'Aide du running back',
  PT: 'Bloc sur l’intérieur (post)',
  UP: 'Bloc en se décalant (pull)',
  PR: 'Protection en déplacement',
  SR: 'Bloque puis part en course',
  CL: 'Bloc au second rideau',
  NB: 'Pas de bloc',
}

export const CAUSE_LABELS: Record<string, string> = {
  Set: 'Placement trop lent (set)',
  Puissance: 'Repoussé en force',
  'Switch / stunt': 'Échange de défenseurs (stunt)',
  Indéterminé: 'Cause non déterminée',
}
export const causeLabel = (c: string) => CAUSE_LABELS[c] ?? c

export const FILTER_LABELS: Record<string, string> = {
  down: 'Tentative',
  distance: 'Yards à gagner',
  quarter: 'Quart-temps',
  score: 'Score',
  red_zone: 'Près de l’en-but (zone rouge)',
  formation: 'Formation de l’attaque',
  personnel_o: 'Joueurs en attaque',
  personnel_d: 'Joueurs en défense',
  coverage: 'Défense en couverture',
  play_action: 'Feinte de course',
  dropback: 'Type de lancer',
  opponent: 'Adversaire',
  week_min: 'De la semaine',
  week_max: 'À la semaine',
}

export const OPTION_LABELS: Record<string, string> = {
  court: 'Court (1 à 3)',
  moyen: 'Moyen (4 à 6)',
  long: 'Long (7 et +)',
  mene_9_plus: 'Mené de 9 pts ou plus',
  mene_1_8: 'Mené de 1 à 8 pts',
  egalite: 'Égalité',
  devant_1_8: 'Devant de 1 à 8 pts',
  devant_9_plus: 'Devant de 9 pts ou plus',
  TRADITIONAL: 'Lancer depuis la poche',
  SCRAMBLE: 'Quarterback qui s’échappe',
  DESIGNED_ROLLOUT_RIGHT: 'Lancer en se déplaçant à droite',
  DESIGNED_ROLLOUT_LEFT: 'Lancer en se déplaçant à gauche',
  SCRAMBLE_ROLLOUT_RIGHT: 'S’échappe vers la droite',
  SCRAMBLE_ROLLOUT_LEFT: 'S’échappe vers la gauche',
  DESIGNED_RUN: 'Course du quarterback',
  UNKNOWN: 'Non précisé',
  SHOTGUN: 'Shotgun (QB reculé)',
  EMPTY: 'Sans running back',
  SINGLEBACK: 'Un running back',
  I_FORM: 'Formation en I',
  PISTOL: 'Pistol',
  JUMBO: 'Jumbo (lourde)',
  WILDCAT: 'Wildcat',
  '5': 'Prolongation',
}

export const optionLabel = (key: string, v: string | number) => {
  if (key === 'down') return Number(v) === 0 ? 'Non précisée' : ordinal(Number(v))
  if (key === 'quarter' && String(v) !== '5') return `${ordinal(Number(v))} QT`
  return OPTION_LABELS[String(v)] ?? String(v)
}

/** Couvertures : nom football + explication courte (survol et rapport). */
export const COVERAGE_HELP: Record<string, string> = {
  'Cover-0': 'Marquage individuel partout, aucun défenseur en sécurité au fond',
  'Cover-1': 'Marquage individuel, un défenseur en sécurité au fond',
  'Cover-2': 'Deux défenseurs se partagent le fond du terrain',
  '2-Man': 'Marquage individuel avec deux défenseurs au fond',
  'Cover-3': 'Défense de zone, le fond partagé en trois',
  Quarters: 'Défense de zone, le fond partagé en quatre',
  'Cover-6': 'Mélange : un côté en trois, l’autre en quatre',
  Bracket: 'Deux défenseurs sur un receveur clé',
  'Goal Line': 'Défense près de son en-but',
  'Red Zone': 'Défense en zone rouge',
  Prevent: 'Défense reculée pour empêcher le grand gain',
  Miscellaneous: 'Autre couverture',
}

export const ordinal = (n: number) => (n === 1 ? '1re' : `${n}e`)

export const downDistance = (down: number, togo: number) =>
  down === 0 ? '—' : `${ordinal(down)} tentative, ${togo} yard${togo > 1 ? 's' : ''} à gagner`

export const heightLabel = (inches: number) =>
  `${(inches * 2.54).toFixed(0)} cm (${Math.floor(inches / 12)}'${inches % 12}")`

/** Situations prêtes en un clic (présélections de filtres). */
export const PRESETS: { id: string; label: string; help: string; filters: Filters }[] = [
  { id: 'all', label: 'Toutes les actions', help: 'Aucun filtre', filters: {} },
  {
    id: 'third_long',
    label: '3e tentative et long',
    help: '3e tentative avec 7 yards ou plus à gagner',
    filters: { down: ['3'], distance: ['long'] },
  },
  { id: 'red_zone', label: 'Zone rouge', help: 'À 20 yards ou moins de l’en-but', filters: { red_zone: 'true' } },
  { id: 'play_action', label: 'Feinte de course', help: 'Le quarterback simule une course', filters: { play_action: 'true' } },
  {
    id: 'close_late',
    label: 'Fin de match serrée',
    help: '4e quart-temps, écart de 8 points ou moins',
    filters: { quarter: ['4'], score: ['mene_1_8', 'egalite', 'devant_1_8'] },
  },
]

export const POSITION_LABELS: Record<string, string> = {
  T: 'Tackle',
  G: 'Guard',
  C: 'Centre',
  LT: 'tackle gauche',
  LG: 'guard gauche',
  RG: 'guard droit',
  RT: 'tackle droit',
}
export const positionLabel = (p: string | null) => (p ? (POSITION_LABELS[p] ?? p) : '—')

export const TEAM_NAMES: Record<string, string> = {
  ARI: 'Arizona Cardinals', ATL: 'Atlanta Falcons', BAL: 'Baltimore Ravens', BUF: 'Buffalo Bills',
  CAR: 'Carolina Panthers', CHI: 'Chicago Bears', CIN: 'Cincinnati Bengals', CLE: 'Cleveland Browns',
  DAL: 'Dallas Cowboys', DEN: 'Denver Broncos', DET: 'Detroit Lions', GB: 'Green Bay Packers',
  HOU: 'Houston Texans', IND: 'Indianapolis Colts', JAX: 'Jacksonville Jaguars', KC: 'Kansas City Chiefs',
  LA: 'Los Angeles Rams', LAC: 'Los Angeles Chargers', LV: 'Las Vegas Raiders', MIA: 'Miami Dolphins',
  MIN: 'Minnesota Vikings', NE: 'New England Patriots', NO: 'New Orleans Saints', NYG: 'New York Giants',
  NYJ: 'New York Jets', PHI: 'Philadelphia Eagles', PIT: 'Pittsburgh Steelers', SEA: 'Seattle Seahawks',
  SF: 'San Francisco 49ers', TB: 'Tampa Bay Buccaneers', TEN: 'Tennessee Titans', WAS: 'Washington',
}

/** Options d'équipes pour les listes avec recherche : nom complet, sigle en indice. */
export const teamOptions = (teams: string[]) =>
  teams.map((t) => ({ value: t, label: TEAM_NAMES[t] ?? t, hint: t }))

/** Recherche sans accents ni majuscules : « Défense » se trouve avec « defense ». */
export const normalize = (s: string) =>
  s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim()
