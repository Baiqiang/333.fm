import { Algorithm, Cube } from 'insertionfinder'

import { getCubieCube, removeComment } from '~/utils/if'

import type { AxisKey } from './types'

export const SETUP_ROTATION: Record<AxisKey, string> = {
  ud: '',
  fb: 'x',
  rl: 'z\'',
}

// Moves are typed/solved in the original scramble frame, but applied after the
// setup rotation when rendering. Each map conjugates a move by the inverse of
// SETUP_ROTATION so that `rot relabel(M)` equals `M rot` (i.e. apply M in the
// original frame, then rotate the whole cube for viewing).
const FACE_RELABEL: Record<AxisKey, Record<string, string>> = {
  ud: {},
  fb: { U: 'B', B: 'D', D: 'F', F: 'U', R: 'R', L: 'L' },
  rl: { U: 'L', L: 'D', D: 'R', R: 'U', F: 'F', B: 'B' },
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

/**
 * Resolve the cube to a cubie state for rendering.
 *
 * The scramble may contain NISS (e.g. `(D2 L2 ...)`). Concatenating the setup
 * rotation onto such a string would change the parsed `inversed` flag and yield
 * the wrong state, so we twist the scramble as its own algorithm first and only
 * then apply the rotation / preview / solution on top of the resolved state.
 */
export function buildCubeState(
  scramble: string,
  axis: AxisKey,
  previewMoves?: string[] | null,
  solution?: string[] | null,
): { corners: number[], edges: number[], placement: number } {
  const cube = new Cube()
  const twist = (alg: string) => {
    const cleaned = removeComment(alg)
    if (cleaned.trim())
      cube.twist(new Algorithm(cleaned))
  }

  try {
    if (scramble?.trim())
      twist(scramble)
    if (SETUP_ROTATION[axis])
      twist(SETUP_ROTATION[axis])

    const previewStr = previewMoves?.length ? relabelSolution(previewMoves, axis) : ''
    const solutionStr = !previewStr && solution?.length ? relabelSolution(solution, axis) : ''
    if (previewStr)
      twist(previewStr)
    else if (solutionStr)
      twist(solutionStr)
  }
  catch {}

  return getCubieCube(cube)
}

export const AXIS_TAB_LABEL: Record<AxisKey, string> = {
  ud: 'U / D',
  fb: 'F / B',
  rl: 'R / L',
}

export const AXIS_TABS: AxisKey[] = ['ud', 'fb', 'rl']
