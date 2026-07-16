import type { BrCaseLabel, BrFacePairKey } from './types'
import type { AxisKey } from '~/utils/fr/types'

export interface BrCaseItem {
  label: BrCaseLabel
  /**
   * Representative scramble (half-turns from solved) that produces this BR case
   * for the given lsAxis / brFacePair. Rendered with CubeCss3d (pensuke-br filter).
   */
  scramble: string
  lsAxis: AxisKey
  brFacePair: BrFacePairKey
}

/**
 * Representative BR case scrambles for lsAxis=ud, brFacePair=fb.
 * Each scramble is a minimal half-turn sequence from the solved state that
 * produces the corresponding Pensuke BR subset, verified by classification.
 *
 * The Pensuke Method defines 11 subsets (2P4 is not a real subset — it was
 * removed since the corrected classification never produces it).
 */
export const brCases: BrCaseItem[] = [
  { label: '4B0', scramble: '', lsAxis: 'ud', brFacePair: 'fb' },
  { label: '4P1', scramble: 'R2', lsAxis: 'ud', brFacePair: 'fb' },
  { label: '2P2', scramble: 'U2 D2 B2 U2 B2 R2 U2 L2', lsAxis: 'ud', brFacePair: 'fb' },
  { label: 'HL2', scramble: 'F2 L2 R2 U2', lsAxis: 'ud', brFacePair: 'fb' },
  { label: '2B3', scramble: 'L2 D2 F2 L2 U2 R2', lsAxis: 'ud', brFacePair: 'fb' },
  { label: '2P3', scramble: 'L2 B2 R2 B2 D2 L2', lsAxis: 'ud', brFacePair: 'fb' },
  { label: 'HL3', scramble: 'D2 F2 U2 R2 F2 L2 B2 R2 U2', lsAxis: 'ud', brFacePair: 'fb' },
  { label: '0P3', scramble: 'U2 L2 B2 U2 L2 R2 B2 D2 F2', lsAxis: 'ud', brFacePair: 'fb' },
  { label: '1B4', scramble: 'R2 U2 L2 F2 L2 B2 D2 L2', lsAxis: 'ud', brFacePair: 'fb' },
  { label: '4P4', scramble: 'D2 R2 B2 U2 L2 B2 R2 U2 L2 F2', lsAxis: 'ud', brFacePair: 'fb' },
  { label: '0P4', scramble: 'L2 B2 R2 D2 L2 U2 R2 U2', lsAxis: 'ud', brFacePair: 'fb' },
]

/** Lower bound on face half-turns encoded as the last digit of the BR label (e.g. 4B0 → 0). */
export function brCaseSliceBound(label: BrCaseLabel): number {
  return Number(label.slice(-1))
}

export interface BrCaseSliceGroup {
  bound: number
  cases: BrCaseItem[]
}

export function groupBrCasesBySlice(cases: BrCaseItem[] = brCases): BrCaseSliceGroup[] {
  const groups = new Map<number, BrCaseItem[]>()
  for (const item of cases) {
    const bound = brCaseSliceBound(item.label)
    const list = groups.get(bound) ?? []
    list.push(item)
    groups.set(bound, list)
  }
  return [...groups.entries()]
    .sort(([a], [b]) => a - b)
    .map(([bound, groupCases]) => ({ bound, cases: groupCases }))
}

