import type { DRCosetInfo, NISSSolution } from './htr-coset'
import { getDRCosetInfo, getHTRCosetTable } from './htr-coset'
import { HTR_NISS_DISTANCES, HTR_NISS_SAMPLES_PER_COSET } from './htr-niss-data'

/** DR-UD states: 8! corners × 8! U/D edges × 4! E-slice edges, halved by parity. */
export const DR_STATE_COUNT = 40320 * 40320 * 24 / 2
/** Size of the HTR group <U2, D2, R2, L2, F2, B2>, i.e. states per HTR coset. */
export const HTR_GROUP_SIZE = 663552

export interface HTRSubsetEdgeStat {
  edges: string
  /** Number of HTR cosets. */
  weight: number
  /** Coset count per optimal HTR length. */
  distances: number[]
  /** Sampled coset share per optimal NISS HTR length, scaled to sum to `weight`. */
  nissDistances: number[]
  cosets: number[]
}

export interface HTRSubsetTransition {
  name: string
  qt: number
}

export interface HTRSubsetStat {
  name: string
  group: string
  qt: number
  weight: number
  distances: number[]
  nissDistances: number[]
  edges: HTRSubsetEdgeStat[]
  /** Subsets reachable with one quarter turn after half-turn setup moves. */
  transitions: HTRSubsetTransition[]
}

export interface HTRSubsetGroupStat {
  name: string
  weight: number
  subsets: HTRSubsetStat[]
}

interface SubsetDef {
  name: string
  group: string
  qt: number
  members: string[]
  edgeBuckets: number[][]
}

const ALL_EDGES = [[0], [2], [4], [6], [8]]
const MERGED_EDGES = [[0, 8], [2, 6], [4]]

const SUBSET_DEFS: SubsetDef[] = [
  ...[0, 3, 4].map(qt => ({ name: `0c${qt}/8c${qt}`, group: '0c/8c', qt, members: [`0c${qt}`, `8c${qt}`], edgeBuckets: ALL_EDGES })),
  ...[3, 4, 5].map(qt => ({ name: `2c${qt}/6c${qt}`, group: '2c/6c', qt, members: [`2c${qt}`, `6c${qt}`], edgeBuckets: ALL_EDGES })),
  ...[1, 2].map(qt => ({ name: `4a${qt}`, group: '4a', qt, members: [`4a${qt}`], edgeBuckets: MERGED_EDGES })),
  ...[2, 5].map(qt => ({ name: `4b${qt}`, group: '4b', qt, members: [`4b${qt}`], edgeBuckets: MERGED_EDGES })),
  ...[3, 4].map(qt => ({ name: `4c${qt}`, group: '4c', qt, members: [`4a${qt}`, `4b${qt}`], edgeBuckets: MERGED_EDGES })),
]

export const HTR_SUBSET_GROUPS = ['0c/8c', '2c/6c', '4a', '4b', '4c']

export const HTR_GROUP_STYLES: Record<string, { bg: string, border: string, hex: string }> = {
  '0c/8c': { bg: 'bg-sky-500', border: 'border-sky-500', hex: '#0ea5e9' },
  '2c/6c': { bg: 'bg-indigo-500', border: 'border-indigo-500', hex: '#6366f1' },
  '4a': { bg: 'bg-purple-500', border: 'border-purple-500', hex: '#a855f7' },
  '4b': { bg: 'bg-pink-500', border: 'border-pink-500', hex: '#ec4899' },
  '4c': { bg: 'bg-orange-500', border: 'border-orange-500', hex: '#f97316' },
}

const DEF_OF_RAW = new Map(SUBSET_DEFS.flatMap(def => def.members.map(m => [m, def])))

function addDistance(list: number[], distance: number) {
  while (list.length <= distance)
    list.push(0)
  list[distance]++
}

let stats: ReturnType<typeof buildStats> | undefined

export function getHTRSubsetStats() {
  stats ??= buildStats()
  return stats
}

function buildStats() {
  const t = getHTRCosetTable()
  const subsets: HTRSubsetStat[] = SUBSET_DEFS.map(def => ({
    name: def.name,
    group: def.group,
    qt: def.qt,
    weight: 0,
    distances: [],
    nissDistances: [],
    edges: def.edgeBuckets.map((bucket, i) => ({
      edges: bucket.map(e => `${e}e`).join('/'),
      weight: 0,
      distances: [],
      nissDistances: (HTR_NISS_DISTANCES[def.name]?.[i] ?? []).map(n => n / HTR_NISS_SAMPLES_PER_COSET),
      cosets: [],
    })),
    transitions: [],
  }))
  for (const s of subsets)
    s.nissDistances = sumDistances(s.edges.map(e => e.nissDistances))
  const byName = new Map(subsets.map(s => [s.name, s]))
  const transitions = new Map(subsets.map(s => [s.name, new Set<string>()]))

  for (let coset = 0; coset < t.size; coset++) {
    const def = DEF_OF_RAW.get(t.cornerSubsets[t.cornerCoset[coset]])!
    const subset = byName.get(def.name)!
    const bucket = def.edgeBuckets.findIndex(b => b.includes(t.badEdges[coset]))
    const edge = subset.edges[bucket]
    subset.weight++
    edge.weight++
    edge.cosets.push(coset)
    addDistance(subset.distances, t.distance[coset])
    addDistance(edge.distances, t.distance[coset])
    for (const move of t.quarterTurnIndexes)
      transitions.get(def.name)!.add(DEF_OF_RAW.get(t.cornerSubsets[t.cornerCoset[t.next(coset, move)]])!.name)
  }
  for (const s of subsets) {
    s.transitions = [...transitions.get(s.name)!]
      .map(name => ({ name, qt: byName.get(name)!.qt }))
      .sort((a, b) => a.qt - b.qt || a.name.localeCompare(b.name))
  }

  const groups: HTRSubsetGroupStat[] = HTR_SUBSET_GROUPS.map((name) => {
    const list = subsets.filter(s => s.group === name)
    return { name, weight: list.reduce((sum, s) => sum + s.weight, 0), subsets: list }
  })
  const qt = [...new Set(subsets.map(s => s.qt))]
    .sort((a, b) => a - b)
    .map(n => ({ qt: n, weight: subsets.filter(s => s.qt === n).reduce((sum, s) => sum + s.weight, 0) }))
  const distances: number[] = []
  for (let coset = 0; coset < t.size; coset++)
    addDistance(distances, t.distance[coset])
  const nissDistances = sumDistances(subsets.map(s => s.nissDistances))
  return { subsets, groups, qt, distances, nissDistances, total: t.size }
}

function sumDistances(lists: number[][]) {
  const out: number[] = []
  for (const list of lists) {
    list.forEach((n, d) => out[d] = (out[d] ?? 0) + (n ?? 0))
  }
  return Array.from(out, n => n ?? 0)
}

export function drWeightToProbability(weight: number): number {
  return weight / getHTRCosetTable().size
}

export function drWeightToCount(weight: number): number {
  return weight * HTR_GROUP_SIZE
}

export function htrDistanceMean(distances: number[]): number {
  const total = distances.reduce((sum, n) => sum + n, 0)
  return distances.reduce((sum, n, d) => sum + n * d, 0) / total
}

/** Share as a percentage, with tiny non-zero shares shown as "<0.1" instead of "0.0". */
export function formatSharePercent(share: number, digits: number): string {
  const min = 10 ** -digits
  return share * 100 < min / 2 ? `<${min}` : (share * 100).toFixed(digits)
}

/** Merged subset and edge bucket of a located DR coset. */
export function getHTRSubsetOf(info: DRCosetInfo) {
  const def = DEF_OF_RAW.get(info.subset)!
  const subset = getHTRSubsetStats().subsets.find(s => s.name === def.name)!
  const edge = subset.edges[def.edgeBuckets.findIndex(b => b.includes(info.badEdges))]
  return { subset, edge }
}

const HALF_TURNS = ['U2', 'D2', 'R2', 'L2', 'F2', 'B2']

function randomHalfTurns(length: number, last?: string) {
  const moves: string[] = []
  while (moves.length < length) {
    const move = HALF_TURNS[Math.floor(Math.random() * HALF_TURNS.length)]
    if (move[0] !== (moves.at(-1) ?? last)?.[0])
      moves.push(move)
  }
  return moves
}

/**
 * A random DR state from one of `cosets`, with its optimal HTR solution.
 * Half turns keep the corner subset and bad edge count, so the suffix stays in the same bucket.
 */
export function randomHTRExample(cosets: number[]) {
  const t = getHTRCosetTable()
  let coset = cosets[Math.floor(Math.random() * cosets.length)]
  const path = t.pathTo(coset)
  const suffix = randomHalfTurns(4 + Math.floor(Math.random() * 4), path.at(-1))
  for (const move of suffix)
    coset = t.next(coset, t.moves.indexOf(move))
  const scramble = [...randomHalfTurns(12), ...path, ...suffix].join(' ')
  return {
    scramble,
    solution: t.solve(coset).join(' '),
    moves: t.distance[coset],
    niss: getDRCosetInfo(scramble)!.niss,
  }
}

/** NISS solution in FMC notation, inverse moves in parentheses. */
export function formatNISSSolution(niss: NISSSolution): string {
  const parts = []
  if (niss.normal.length)
    parts.push(niss.normal.join(' '))
  if (niss.inverse.length)
    parts.push(`(${niss.inverse.join(' ')})`)
  return parts.join(' ') || '-'
}
