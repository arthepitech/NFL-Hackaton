import { interpolateRgb, scaleSequential } from 'd3'

// Échelles séquentielles neutres : vert / rouge restent réservés au top / bottom 10 %
// (VISUALISATIONS.md §4). Bleu = notre équipe, orange = adversaire.
export const blueScale = (min: number, max: number) =>
  scaleSequential(interpolateRgb('#1b2430', '#3b82f6')).domain([min, max])
export const amberScale = (min: number, max: number) =>
  scaleSequential(interpolateRgb('#1b2430', '#f59e0b')).domain([min, max])
