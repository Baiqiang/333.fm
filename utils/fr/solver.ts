import { isFrShape } from './analysis'
import {
  applyPerm,
  type AxisIndex,
  CORNER_CUBIES,
  type CubeState,
  EDGE_CUBIES,
  type Face,
  HALF_TURN,
  SOLVED,
} from './cube'

const ALL_FACES: Face[] = ['U', 'D', 'R', 'L', 'F', 'B']

/** Axial faces for each axis (the two faces of that axis). */
const AXIS_FACES: Record<AxisIndex, Face[]> = {
  0: ['R', 'L'],
  1: ['U', 'D'],
  2: ['F', 'B'],
}

function sideFaces(axis: AxisIndex): Face[] {
  const af = AXIS_FACES[axis]
  return ALL_FACES.filter(f => !af.includes(f))
}

/**
 * Reduced state key: all corner stickers + edge stickers for the axis.
 * In Leave-slice mode (default) the middle-layer edges are ignored; in full
 * mode all edges are included so the goal requires fully restoring the slice.
 */
function reducedKey(state: CubeState, axis: AxisIndex, leaveSlice = true): string {
  const parts: string[] = []
  for (const cc of CORNER_CUBIES) {
    for (const si of cc.stickers) parts.push(state[si])
  }
  for (const ec of EDGE_CUBIES) {
    if (!leaveSlice || ec.coord[axis] !== 0) {
      for (const si of ec.stickers) parts.push(state[si])
    }
  }
  return parts.join('')
}

const goalCache = new Map<string, Set<string>>()

/** True FR goal set: all reduced states reachable from solved using only the four side half-turns of this axis. */
function goalSet(axis: AxisIndex, leaveSlice = true): Set<string> {
  const cacheKey = `${axis}:${leaveSlice}`
  const cached = goalCache.get(cacheKey)
  if (cached)
    return cached

  const set = new Set<string>()
  const seen = new Set<string>()
  const start = reducedKey(SOLVED, axis, leaveSlice)
  set.add(start)
  seen.add(start)
  let frontier: CubeState[] = [SOLVED]
  const sides = sideFaces(axis)
  while (frontier.length) {
    const next: CubeState[] = []
    for (const s of frontier) {
      for (const m of sides) {
        const ns = applyPerm(s, HALF_TURN[m])
        const k = reducedKey(ns, axis, leaveSlice)
        if (!seen.has(k)) {
          seen.add(k)
          set.add(k)
          next.push(ns)
        }
      }
    }
    frontier = next
  }
  goalCache.set(cacheKey, set)
  return set
}

/** Whether the state is already true FR (the axis can be restored using only four side half-turns). */
export function isTrueFr(state: CubeState, axis: AxisIndex, leaveSlice = true): boolean {
  return goalSet(axis, leaveSlice).has(reducedKey(state, axis, leaveSlice))
}

interface SearchNode {
  state: CubeState
  path: Face[]
}

/**
 * BFS within the half-turn group to find the shortest half-turn sequence that achieves true FR on the axis.
 * Returns e.g. ["R2","F2","U2"]; [] if already true FR; null if unreachable (not HTR).
 */
export function solveAxis(
  start: CubeState,
  axis: AxisIndex,
  leaveSlice = true,
  maxDepth = 14,
): string[] | null {
  const goals = goalSet(axis, leaveSlice)
  const startKey = reducedKey(start, axis, leaveSlice)
  if (goals.has(startKey))
    return []

  const seen = new Set<string>([startKey])
  let frontier: SearchNode[] = [{ state: start, path: [] }]
  for (let depth = 0; depth < maxDepth; depth++) {
    const next: SearchNode[] = []
    for (const node of frontier) {
      const last = node.path[node.path.length - 1]
      for (const m of ALL_FACES) {
        if (m === last)
          continue // consecutive half-turns on the same face are redundant
        const ns = applyPerm(node.state, HALF_TURN[m])
        const k = reducedKey(ns, axis, leaveSlice)
        if (goals.has(k))
          return [...node.path, m].map(f => `${f}2`)
        if (!seen.has(k)) {
          seen.add(k)
          next.push({ state: ns, path: [...node.path, m] })
        }
      }
    }
    if (next.length === 0)
      break
    frontier = next
  }
  return null
}

/**
 * Find the shortest half-turn sequence that achieves FR shape (0 bad edges + 0 corner shape; may be false FR).
 * Used to demonstrate step breakdown when finishing by shape can yield false FR.
 */
export function solveAxisShape(
  start: CubeState,
  axis: AxisIndex,
  maxDepth = 14,
): string[] | null {
  if (isFrShape(start, axis))
    return []
  const seen = new Set<string>([reducedKey(start, axis)])
  let frontier: SearchNode[] = [{ state: start, path: [] }]
  for (let depth = 0; depth < maxDepth; depth++) {
    const next: SearchNode[] = []
    for (const node of frontier) {
      const last = node.path[node.path.length - 1]
      for (const m of ALL_FACES) {
        if (m === last)
          continue
        const ns = applyPerm(node.state, HALF_TURN[m])
        if (isFrShape(ns, axis))
          return [...node.path, m].map(f => `${f}2`)
        const k = reducedKey(ns, axis)
        if (!seen.has(k)) {
          seen.add(k)
          next.push({ state: ns, path: [...node.path, m] })
        }
      }
    }
    if (next.length === 0)
      break
    frontier = next
  }
  return null
}
