import type { Face } from './cube'

const FACES: Face[] = ['U', 'D', 'R', 'L', 'F', 'B']
/** Opposite faces on the same axis; avoids redundant consecutive moves on one axis. */
const AXIS_OF: Record<Face, number> = { U: 1, D: 1, R: 0, L: 0, F: 2, B: 2 }

/**
 * Generate a scramble guaranteed to be in HTR: apply random half-turns to the solved state.
 * Half-turns only, so the result is always in the half-turn group (HTR).
 */
export function generateHtrScramble(length = 16): string {
  const tokens: string[] = []
  let lastAxis = -1
  for (let i = 0; i < length; i++) {
    let face: Face
    do {
      face = FACES[Math.floor(Math.random() * FACES.length)]
    } while (AXIS_OF[face] === lastAxis)
    lastAxis = AXIS_OF[face]
    tokens.push(`${face}2`)
  }
  return tokens.join(' ')
}
