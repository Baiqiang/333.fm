import type { AxisIndex } from './cube'

export type AxisKey = 'ud' | 'fb' | 'rl'

export const AXIS_LIST: { key: AxisKey, axis: AxisIndex, faces: string }[] = [
  { key: 'ud', axis: 1, faces: 'U/D' },
  { key: 'fb', axis: 2, faces: 'F/B' },
  { key: 'rl', axis: 0, faces: 'R/L' },
]

export const AXIS_INDEX: Record<AxisKey, AxisIndex> = {
  ud: 1,
  fb: 2,
  rl: 0,
}

/** Corner shape labels: 0 / 1 / 2RL / 2FB / 2UD */
export type CornerLabel = '0' | '1' | '2RL' | '2FB' | '2UD'

/** Bad-edge classification labels */
export type EdgeLabel =
  | '0bad'
  | '2bad'
  | '4-0'
  | '3-1'
  | '2-2o'
  | '2-2a'
  | '6bad'
  | '8bad'

export interface AxisClassification {
  edgeLabel: EdgeLabel
  cornerLabel: CornerLabel
  badCount: number
  badTop: number
  badBottom: number
}

/** Single step in a solution breakdown */
export interface SolutionStep {
  /** Half-turn executed this step (null for the initial state) */
  move: string | null
  /** Shape label for this axis after the move, e.g. "3-1 / 2RL" */
  caseLabel: string
  /** Whether true FR has been reached after this move */
  trueFr: boolean
  /** If the current shape is a known base trigger, its finishing formula */
  trigger?: string
}

/** Base case (FR trigger) → finishing formula (UD axis) */
export const FR_TRIGGERS: Record<string, string> = {
  '4-0 / 1': 'U2',
  '3-1 / 2FB': 'R2 U2',
  '2-2a / 2FB': 'F2 R2 U2',
  '2-2a / 2RL': 'R2 F2 U2',
  '2-2o / 1': 'R2 L2 U2',
}

export interface AxisResult extends AxisClassification {
  axisKey: AxisKey
  /** Shortest true FR reference steps from the solver (half-turns, e.g. ["R2","F2","U2"]) */
  solution: string[] | null
  /** Shortest steps to reach FR shape (may be false FR) */
  shapeSolution: string[] | null
  /** Whether already at true FR (solution is an empty array) */
  alreadyFr: boolean
  /** Input is already FR shape but false FR (needs an axial half-turn) */
  inputFalseFr: boolean
  /** Finishing via shapeSolution yields false FR (insert axial half-turn mid-sequence for parity) */
  shapeIsFalseFr: boolean
  /** Case label, e.g. "3-1/2RL" */
  caseLabel: string
  /** Step-by-step breakdown of the true FR solution */
  decomposition: SolutionStep[]
  /** Step-by-step breakdown of the shape solution (only when shapeIsFalseFr) */
  shapeDecomposition: SolutionStep[] | null
}

export interface FrAnalysis {
  ok: boolean
  errorToken?: string // token that failed to parse
  isHtr: boolean
  scramble: string
  axes: AxisResult[]
}
