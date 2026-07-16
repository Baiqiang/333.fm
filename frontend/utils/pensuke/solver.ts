import type { BrFacePairKey, LsSolution, PensukeStep } from './types'
import type { AxisKey } from '~/utils/fr/types'

import {
  applyMoves,
  applyPerm,
  type CubeState,
  type Face,
  HALF_TURN,
} from '~/utils/fr/cube'
import {
  classifyBrFacePair,
  countHalfTurnsOnFaces,
  formatBrLabel,
  halfTurnFacesForBrPair,
} from './classification'
import { isLeaveSliceGoal } from './ls'
import { brPairsForFrAxis } from './types'

const ALL_FACES: Face[] = ['U', 'D', 'R', 'L', 'F', 'B']

interface SearchNode {
  state: CubeState
  path: string[]
}

interface ClassifyContext {
  frAxis: AxisKey
  br0: BrFacePairKey
  br1: BrFacePairKey
}

function buildStepTracks(
  state: CubeState,
  frAxis: AxisKey,
  br0: BrFacePairKey,
  br1: BrFacePairKey,
): { br0: string, br1: string } {
  return {
    br0: formatBrLabel(classifyBrFacePair(state, frAxis, br0)),
    br1: formatBrLabel(classifyBrFacePair(state, frAxis, br1)),
  }
}

function decomposeSolution(
  start: CubeState,
  moves: string[],
  frAxis: AxisKey,
): PensukeStep[] {
  const [br0, br1] = brPairsForFrAxis(frAxis)
  const steps: PensukeStep[] = []
  let cur = start
  const initial = buildStepTracks(cur, frAxis, br0, br1)
  steps.push({ move: null, brTracks: [initial.br0, initial.br1] })
  for (const m of moves) {
    cur = applyMoves(cur, [m])
    const t = buildStepTracks(cur, frAxis, br0, br1)
    steps.push({ move: m, brTracks: [t.br0, t.br1] })
  }
  return steps
}

function safeClassify(state: CubeState, frAxis: AxisKey, brPair: BrFacePairKey) {
  try {
    return classifyBrFacePair(state, frAxis, brPair)
  }
  catch {
    return null
  }
}

function prune(
  path: string[],
  ctx: ClassifyContext,
  start: CubeState,
  depth: number,
  maxDepth: number,
): boolean {
  const remaining = maxDepth - depth
  const state = applyMoves(start, path)
  const br0c = safeClassify(state, ctx.frAxis, ctx.br0)
  const br1c = safeClassify(state, ctx.frAxis, ctx.br1)
  if (!br0c || !br1c)
    return false
  const faces0 = halfTurnFacesForBrPair(ctx.br0)
  const faces1 = halfTurnFacesForBrPair(ctx.br1)
  const used0 = countHalfTurnsOnFaces(path, faces0)
  const used1 = countHalfTurnsOnFaces(path, faces1)
  const need0 = Math.max(0, br0c.bound - used0)
  const need1 = Math.max(0, br1c.bound - used1)
  if (need0 + need1 > remaining)
    return true
  return false
}

/** BFS runs directly on the physical HTR state; the goal check uses the correct slice axis. */
function solveBfs(
  start: CubeState,
  lsAxis: AxisKey,
  frAxis: AxisKey,
  maxDepth = 14,
): string[] | null {
  const [br0, br1] = brPairsForFrAxis(frAxis)
  const ctx: ClassifyContext = { frAxis, br0, br1 }

  if (isLeaveSliceGoal(start, lsAxis))
    return []

  const seen = new Set<string>()
  const keyOf = (s: CubeState) => s.join('')
  seen.add(keyOf(start))

  let frontier: SearchNode[] = [{ state: start, path: [] }]
  for (let depth = 0; depth < maxDepth; depth++) {
    const next: SearchNode[] = []
    for (const node of frontier) {
      const lastFace = node.path.length > 0 ? node.path[node.path.length - 1]![0] : null
      for (const m of ALL_FACES) {
        if (m === lastFace)
          continue
        const moveToken = `${m}2`
        const ns = applyPerm(node.state, HALF_TURN[m])
        const k = keyOf(ns)
        if (seen.has(k))
          continue
        const path = [...node.path, moveToken]
        if (isLeaveSliceGoal(ns, lsAxis))
          return path
        if (prune(path, ctx, start, depth + 1, maxDepth))
          continue
        seen.add(k)
        next.push({ state: ns, path })
      }
    }
    if (next.length === 0)
      break
    frontier = next
  }
  return null
}

export function solveLeaveSlice(
  start: CubeState,
  lsAxis: AxisKey,
  frAxis: AxisKey,
  maxDepth = 14,
  _scrambleMoves: string[] = [],
): LsSolution[] {
  const solutions: LsSolution[] = []
  const [br0, br1] = brPairsForFrAxis(frAxis)

  const moves = solveBfs(start, lsAxis, frAxis, maxDepth)
  if (!moves)
    return solutions

  const brTrack0: string[] = []
  const brTrack1: string[] = []
  let cur = start
  const t0 = buildStepTracks(cur, frAxis, br0, br1)
  brTrack0.push(t0.br0)
  brTrack1.push(t0.br1)
  for (const m of moves) {
    cur = applyMoves(cur, [m])
    const t = buildStepTracks(cur, frAxis, br0, br1)
    brTrack0.push(t.br0)
    brTrack1.push(t.br1)
  }
  solutions.push({
    moves,
    direction: 'normal',
    lsAxis,
    brTrack0,
    brTrack1,
    steps: decomposeSolution(start, moves, frAxis),
  })

  return solutions
}
