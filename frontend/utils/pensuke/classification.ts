import type { BrFacePairKey } from './types'
import type { Face } from '~/utils/fr/cube'

export { classifyBrFacePair, formatBrLabel } from './pensuke-br-subset'

/** Half-turn faces that reduce this BR face pair (e.g. F2/B2 for F/B pair). */
export function halfTurnFacesForBrPair(brPair: BrFacePairKey): Face[] {
  if (brPair === 'fb')
    return ['F', 'B']
  if (brPair === 'rl')
    return ['R', 'L']
  return ['U', 'D']
}

export function countHalfTurnsOnFaces(moves: string[], faces: Face[]): number {
  let n = 0
  for (const m of moves) {
    if (m.length >= 2 && m[1] === '2' && faces.includes(m[0] as Face))
      n++
  }
  return n
}
