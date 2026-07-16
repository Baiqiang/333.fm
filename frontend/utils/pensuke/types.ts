import type { CubeState } from '~/utils/fr/cube'
import type { AxisKey } from '~/utils/fr/types'

export type { AxisKey }

export type BrCaseLabel =
  | '4B0'
  | '2B3'
  | '1B4'
  | '4P1'
  | '4P4'
  | '2P2'
  | '2P3'
  | '2P4'
  | 'HL2'
  | 'HL3'
  | '0P3'
  | '0P4'

/** Side axis perpendicular to LS axis (F/B or R/L or U/D as a pair). */
export type BrFacePairKey = 'fb' | 'rl' | 'ud'

/** The two BR face-pair axes given the selected FR axis (order matches pensuke.js). */
export function brPairsForFrAxis(frAxis: AxisKey): [BrFacePairKey, BrFacePairKey] {
  if (frAxis === 'ud')
    return ['fb', 'rl']
  if (frAxis === 'fb')
    return ['fb', 'ud']
  return ['ud', 'rl']
}

export interface BrClassification {
  label: BrCaseLabel
  /** Lower bound on half-turns of the face-pair axis (e.g. R2/L2 for F/B view). */
  bound: number
}

export interface PensukeStep {
  move: string | null
  brTracks: [string, string]
}

export interface LsSolution {
  moves: string[]
  direction: 'normal' | 'inverse'
  lsAxis: AxisKey
  brTrack0: string[]
  brTrack1: string[]
  steps: PensukeStep[]
}

export interface PensukeParseResult {
  ok: boolean
  errorToken?: string
  scramble: string
  /** Physical scramble move tokens (for LS search axis transform). */
  scrambleMoves: string[]
  normal: string[]
  inverse: string[]
  drAxis: string
  lastDirection: 'normal' | 'inverse'
  state: CubeState | null
  isHtr: boolean
}

export interface PreviewStep { index: number }
