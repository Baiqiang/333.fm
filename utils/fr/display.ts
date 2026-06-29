import type { AxisKey } from './types'

export const SETUP_ROTATION: Record<AxisKey, string> = {
  ud: '',
  fb: 'x',
  rl: 'z\'',
}

const FACE_RELABEL: Record<AxisKey, Record<string, string>> = {
  ud: {},
  fb: { U: 'F', F: 'D', D: 'B', B: 'U', R: 'R', L: 'L' },
  rl: { U: 'R', R: 'D', D: 'L', L: 'U', F: 'F', B: 'B' },
}

export function relabelSolution(moves: string[], axis: AxisKey): string {
  const map = FACE_RELABEL[axis]
  return moves
    .map((mv) => {
      const face = mv[0]
      const rest = mv.slice(1)
      return `${map[face] ?? face}${rest}`
    })
    .join(' ')
}

export function buildCubeMoves(
  scramble: string,
  axis: AxisKey,
  previewMoves?: string[] | null,
  solution?: string[] | null,
): string {
  const rot = SETUP_ROTATION[axis]
  const previewStr = previewMoves?.length ? relabelSolution(previewMoves, axis) : ''
  const solutionStr = !previewStr && solution?.length ? relabelSolution(solution, axis) : ''
  return [scramble || '', rot, previewStr, solutionStr].filter(Boolean).join(' ')
}

export const AXIS_TAB_LABEL: Record<AxisKey, string> = {
  ud: 'U / D',
  fb: 'F / B',
  rl: 'R / L',
}

export const AXIS_TABS: AxisKey[] = ['ud', 'fb', 'rl']
