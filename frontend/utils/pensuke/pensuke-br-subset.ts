import type { BrCaseLabel, BrClassification, BrFacePairKey } from './types'
import type { AxisKey } from '~/utils/fr/types'

import { LOCS, type CubeState, type Face } from '~/utils/fr/cube'

import { PENSUKE_BR_SUBSETS } from './br-subsets-data'

const PENSUKE_FACE: Face[] = ['U', 'L', 'F', 'R', 'B', 'D']

/** FR sticker index for each pensuke facelet slot (U,L,F,R,B,D order). */
const PENSUKE_TO_FR: readonly number[] = buildPensukeToFrMap()

function buildPensukeToFrMap(): number[] {
  const key = (c: readonly number[], n: readonly number[]) => `${c.join(',')}|${n.join(',')}`
  const locIndex = new Map(LOCS.map((l, i) => [key(l.coord, l.normal), i]))
  const map: number[] = new Array(54)
  for (let pi = 0; pi < 54; pi++) {
    const face = PENSUKE_FACE[Math.floor(pi / 9)]!
    const local = pi % 9
    const row = Math.floor(local / 3)
    const col = local % 3
    const coord = pensukeSlotToCoord(face, row, col)
    const normal = faceNormal(face)
    const fi = locIndex.get(key(coord, normal))
    if (fi === undefined)
      throw new Error(`pensuke slot ${pi} has no FR mapping`)
    map[pi] = fi
  }
  return map
}

function pensukeSlotToCoord(face: Face, row: number, col: number): [number, number, number] {
  if (face === 'U')
    return [col - 1, 1, row - 1]
  if (face === 'D')
    return [col - 1, -1, 1 - row]
  if (face === 'F')
    return [col - 1, 1 - row, 1]
  if (face === 'B')
    return [1 - col, 1 - row, -1]
  if (face === 'R')
    return [1, 1 - row, 1 - col]
  return [-1, 1 - row, col - 1]
}

function faceNormal(face: Face): [number, number, number] {
  if (face === 'U')
    return [0, 1, 0]
  if (face === 'D')
    return [0, -1, 0]
  if (face === 'R')
    return [1, 0, 0]
  if (face === 'L')
    return [-1, 0, 0]
  if (face === 'F')
    return [0, 0, 1]
  return [0, 0, -1]
}

function stickerAtPensuke(state: CubeState, pi: number): Face {
  return state[PENSUKE_TO_FR[pi]!]!
}

function barSignature(state: CubeState, indices: readonly [number, number, number, number, number, number]): string {
  const [a, b, c, d, e, f] = indices
  return `${stickerAtPensuke(state, a)}${stickerAtPensuke(state, b)}`
    + `-`
    + `${stickerAtPensuke(state, c)}${stickerAtPensuke(state, d)}`
    + `-`
    + `${stickerAtPensuke(state, e)}${stickerAtPensuke(state, f)}`
}

function lookupBrSubsetFb(state: CubeState): BrCaseLabel {
  const bars = [
    barSignature(state, [6, 18, 7, 19, 8, 20]),
    barSignature(state, [47, 26, 46, 25, 45, 24]),
    barSignature(state, [51, 44, 52, 43, 53, 42]),
    barSignature(state, [2, 36, 1, 37, 0, 38]),
  ]
  bars.sort()
  const label = PENSUKE_BR_SUBSETS[bars.join('/')]
  if (!label)
    throw new Error(`unknown pensuke FB subset: ${bars.join('/')}`)
  return label
}

function lookupBrSubsetRl(state: CubeState): BrCaseLabel {
  const bars = [
    barSignature(state, [8, 27, 5, 28, 2, 29]),
    barSignature(state, [53, 35, 50, 34, 47, 33]),
    barSignature(state, [45, 17, 48, 16, 51, 15]),
    barSignature(state, [0, 9, 3, 10, 6, 11]),
  ]
  bars.sort()
  const key = bars.join('/').replaceAll('R', 'F').replaceAll('L', 'B')
  const label = PENSUKE_BR_SUBSETS[key]
  if (!label)
    throw new Error(`unknown pensuke RL subset: ${key}`)
  return label
}

/**
 * UD BR subset: reads E-slice edges (FR, FL, BL, BR) via z+90° rotation equivalence.
 * Bar indices derived by inverse-rotating the FB lookup positions.
 * Normalization R→U, L→D maps equatorial colors to U/D equivalents.
 */
function lookupBrSubsetUd(state: CubeState): BrCaseLabel {
  const bars = [
    barSignature(state, [27, 20, 30, 23, 33, 26]),
    barSignature(state, [17, 24, 14, 21, 11, 18]),
    barSignature(state, [9, 38, 12, 41, 15, 44]),
    barSignature(state, [35, 42, 32, 39, 29, 36]),
  ]
  bars.sort()
  const key = bars.join('/').replaceAll('R', 'U').replaceAll('L', 'D')
  const label = PENSUKE_BR_SUBSETS[key]
  if (!label)
    throw new Error(`unknown pensuke UD subset: ${key}`)
  return label
}

const BOUND_TABLE: Record<BrCaseLabel, number> = {
  '4B0': 0,
  '2B3': 3,
  '1B4': 4,
  '4P1': 1,
  '4P4': 4,
  '2P2': 2,
  '2P3': 3,
  '2P4': 4,
  'HL2': 2,
  'HL3': 3,
  '0P3': 3,
  '0P4': 4,
}

function lookupForBrPair(state: CubeState, frAxis: AxisKey, brPair: BrFacePairKey): BrCaseLabel {
  if (brPair === 'fb')
    return lookupBrSubsetFb(state)
  if (brPair === 'rl')
    return lookupBrSubsetRl(state)
  return lookupBrSubsetUd(state)
}

/** Classify a BR face-pair using the official pensuke lookup tables. */
export function classifyBrFacePair(
  state: CubeState,
  frAxis: AxisKey,
  brPair: BrFacePairKey,
): BrClassification {
  const label = lookupForBrPair(state, frAxis, brPair)
  return { label, bound: BOUND_TABLE[label] }
}

export function formatBrLabel(c: BrClassification): string {
  return c.label
}
