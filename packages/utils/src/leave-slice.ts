import { Algorithm, Cube } from 'insertionfinder'

export type LsAxis = 'ud' | 'fb' | 'rl'
export type Slice = 'M' | 'S' | 'E'
export type DsSecondSlice = Slice | 'either'
export type SliceGoal = { mode: 'ls', axis: LsAxis } | { mode: 'ds', axis: LsAxis, secondSlice: DsSecondSlice }

export const LS_MAX_DISTANCE = 12
export const LS_HALF_TURNS = ['U2', 'D2', 'R2', 'L2', 'F2', 'B2'] as const

// insertionfinder uses source cubie -> destination, with orientation packed in
// the low part (3 * corner position; 2 * edge position for oriented cubies).
const EDGE_ORBITS = [[2, 0, 6, 4], [3, 1, 7, 5], [10, 9, 8, 11]]
const IGNORED_ORBIT: Record<LsAxis, number> = { ud: 2, fb: 1, rl: 0 }
const STATE_COUNT = 96 * 24 * 24
const SLICES: Slice[] = ['M', 'S', 'E']

export function drSlice(axis: LsAxis): Slice {
  if (!Object.prototype.hasOwnProperty.call(IGNORED_ORBIT, axis))
    throw new RangeError('Invalid DR axis')
  return SLICES[IGNORED_ORBIT[axis]]
}

export function dsSecondSlices(axis: LsAxis): Slice[] {
  return SLICES.filter(slice => slice !== drSlice(axis))
}

export function sliceGoalMaxDistance(goal: SliceGoal): number {
  drSlice(goal.axis)
  if (goal.mode === 'ls')
    return LS_MAX_DISTANCE
  if (goal.mode !== 'ds' || (goal.secondSlice !== 'either' && !dsSecondSlices(goal.axis).includes(goal.secondSlice)))
    throw new RangeError('The second slice must differ from the DR slice')
  return goal.secondSlice === 'either' ? 10 : 11
}

function permutations(values: number[]): number[][] {
  if (values.length === 0)
    return [[]]
  return values.flatMap((v, i) => permutations(values.filter((_, j) => i !== j)).map(p => [v, ...p]))
}

function parity(p: number[]): number {
  let sign = 0
  for (let i = 0; i < p.length; i++) {
    for (let j = i + 1; j < p.length; j++)
      sign ^= Number(p[i] > p[j])
  }
  return sign
}

function buildModel() {
  const moves = LS_HALF_TURNS.map((move) => {
    const cube = new Cube()
    cube.twist(new Algorithm(move))
    return { corners: cube.getRawCorners().map(p => p / 3), edges: cube.getRawEdges().map(p => p / 2) }
  })
  const corners = [Array.from({ length: 8 }, (_, i) => i)]
  const cornerIndex = new Map([[corners[0].join(','), 0]])
  for (const state of corners) {
    for (const move of moves) {
      const next = state.map(p => move.corners[p])
      const key = next.join(',')
      if (!cornerIndex.has(key)) {
        cornerIndex.set(key, corners.length)
        corners.push(next)
      }
    }
  }
  const small = permutations([0, 1, 2, 3])
  const smallIndex = new Map(small.map((p, i) => [p.join(','), i]))
  const cornerMoves = moves.map(move => corners.map(p => cornerIndex.get(p.map(i => move.corners[i]).join(','))!))
  const edgeMoves = EDGE_ORBITS.map(orbit => moves.map(move => small.map(p =>
    smallIndex.get(p.map(i => orbit.indexOf(move.edges[orbit[i]])).join(','))!,
  )))
  return { corners, cornerIndex, small, smallIndex, signs: small.map(parity), cornerMoves, edgeMoves }
}

let model: ReturnType<typeof buildModel> | undefined
function getModel() {
  model ??= buildModel()
  return model
}

function keptOrbits(axis: LsAxis): number[] {
  if (!(axis in IGNORED_ORBIT))
    throw new RangeError('Invalid LS axis')
  return [0, 1, 2].filter(i => i !== IGNORED_ORBIT[axis])
}

function nextState(state: number, move: number, kept: number[]): number {
  const m = getModel()
  const b = state % 24
  const a = Math.floor(state / 24) % 24
  const c = Math.floor(state / 576)
  return (m.cornerMoves[move][c] * 24 + m.edgeMoves[kept[0]][move][a]) * 24 + m.edgeMoves[kept[1]][move][b]
}

interface DistanceTable {
  distances: Uint8Array
  order: Uint16Array
  cumulative: number[]
  kept: number[]
}

const tables = new Map<string, DistanceTable>()

// The DR-slice parity is determined by the two retained permutations. Requiring
// both retained permutations to be even also makes the DR slice even.
function isGoalState(state: number, goal: SliceGoal, kept: number[]): boolean {
  if (goal.mode === 'ls')
    return state === 0
  if (state >= 576)
    return false // Every corner must be exactly solved.
  const a = Math.floor(state / 24)
  const b = state % 24
  const { signs } = getModel()
  if (signs[a] || signs[b])
    return false
  if (goal.secondSlice === 'either')
    return a === 0 || b === 0
  return SLICES[kept[0]] === goal.secondSlice ? b === 0 : a === 0
}

function getTable(goal: SliceGoal): DistanceTable {
  const maximum = sliceGoalMaxDistance(goal)
  const key = `${goal.mode}:${goal.axis}:${goal.mode === 'ds' ? goal.secondSlice : ''}`
  const cached = tables.get(key)
  if (cached)
    return cached
  const kept = keptOrbits(goal.axis)
  const distances = new Uint8Array(STATE_COUNT).fill(255)
  const order = new Uint16Array(STATE_COUNT)
  let tail = 0
  // Multi-source BFS: 1 projected LS goal, 12 fixed DS goals, or 23 DS-union
  // goals. In particular, the overlap is seeded just once.
  for (let state = 0; state < 576; state++) {
    if (isGoalState(state, goal, kept)) {
      distances[state] = 0
      order[tail++] = state
    }
  }
  for (let head = 0; head < tail; head++) {
    const state = order[head]
    for (let move = 0; move < 6; move++) {
      const next = nextState(state, move, kept)
      if (distances[next] === 255) {
        distances[next] = distances[state] + 1
        order[tail++] = next
      }
    }
  }
  if (tail !== STATE_COUNT)
    throw new Error('Incomplete HTR distance table')
  const cumulative = Array.from({ length: maximum + 1 }, () => 0)
  for (const d of distances) {
    if (d > maximum)
      throw new Error('Unexpected HTR distance')
    cumulative[d]++
  }
  for (let d = 1; d <= maximum; d++) cumulative[d] += cumulative[d - 1]
  const table = { distances, order, cumulative, kept }
  tables.set(key, table)
  return table
}

function shortestSolution(state: number, goal: SliceGoal): string[] {
  const table = getTable(goal)
  const solution: string[] = []
  while (table.distances[state] > 0) {
    let found = false
    for (let move = 0; move < 6; move++) {
      const next = nextState(state, move, table.kept)
      if (table.distances[next] === table.distances[state] - 1) {
        solution.push(LS_HALF_TURNS[move])
        state = next
        found = true
        break
      }
    }
    if (!found)
      throw new Error('Missing shortest path')
  }
  return solution
}

function projectedState(cube: Cube, axis: LsAxis): number {
  const m = getModel()
  const rawCorners = cube.getRawCorners()
  const rawEdges = cube.getRawEdges()
  const corner = m.cornerIndex.get(rawCorners.map(p => p / 3).join(','))
  const edges = EDGE_ORBITS.map(orbit => m.smallIndex.get(orbit.map(i => orbit.indexOf(rawEdges[i] / 2)).join(',')))
  if (cube.placement !== 0 || corner === undefined || edges.some(e => e === undefined))
    throw new Error('Expected a true HTR state in the fixed scramble frame')
  const edgeRanks = edges as number[]
  if (edgeRanks.reduce((sign, e) => sign ^ m.signs[e], 0) !== 0)
    throw new Error('Expected a true HTR state in the fixed scramble frame')
  const kept = keptOrbits(axis)
  return (corner * 24 + edgeRanks[kept[0]]) * 24 + edgeRanks[kept[1]]
}

/** Exact HT-only solution, for a true HTR cube in the fixed scramble frame. */
export function solveSliceHalfTurns(cube: Cube, goal: SliceGoal): string[] {
  sliceGoalMaxDistance(goal)
  return shortestSolution(projectedState(cube, goal.axis), goal)
}

/** QT answers are accepted if their final state is one of the same DS goals
 * used by the HT distance search: oriented edges in their own orbits, both
 * remaining slice permutations even, all corners and the third orbit solved.
 */
export function isDsGoal(cube: Cube, axis: LsAxis, secondSlice: DsSecondSlice): boolean {
  const goal: SliceGoal = { mode: 'ds', axis, secondSlice }
  sliceGoalMaxDistance(goal)
  try {
    return isGoalState(projectedState(cube, axis), goal, keptOrbits(axis))
  }
  catch {
    return false
  }
}

export function matchingDsSlices(cube: Cube, axis: LsAxis): Slice[] {
  return dsSecondSlices(axis).filter(slice => isDsGoal(cube, axis, slice))
}

export interface LsPracticeState {
  cube: Cube
  solution: string[]
}

/** Uniform over full true HTR states with HT-only goal distance <= maxMoves.
 * Each projected state has exactly 12 legal completions of the ignored slice.
 * Zero-move LS states are included, as is the fully solved cube.
 */
export function sampleSliceState(goal: SliceGoal, maxMoves = sliceGoalMaxDistance(goal), random: () => number = Math.random): LsPracticeState {
  const maximum = sliceGoalMaxDistance(goal)
  if (!Number.isInteger(maxMoves) || maxMoves < 0 || maxMoves > maximum)
    throw new RangeError(`Distance must be an integer from 0 to ${maximum}`)
  const m = getModel()
  const table = getTable(goal)
  const state = table.order[Math.floor(random() * table.cumulative[maxMoves])]
  const a = Math.floor(state / 24) % 24
  const b = state % 24
  const c = Math.floor(state / 576)
  const sign = m.signs[a] ^ m.signs[b]
  const completions = m.small.map((_, i) => i).filter(i => m.signs[i] === sign)
  const ranks = [0, 0, 0]
  ranks[table.kept[0]] = a
  ranks[table.kept[1]] = b
  ranks[IGNORED_ORBIT[goal.axis]] = completions[Math.floor(random() * completions.length)]
  const edges = Array.from({ length: 12 }, () => 0)
  EDGE_ORBITS.forEach((orbit, i) => {
    orbit.forEach((source, j) => { edges[source] = orbit[m.small[ranks[i]][j]] * 2 })
  })
  const cube = Cube.fromCubieCube(m.corners[c].map(p => p * 3), edges, 0)
  return { cube, solution: shortestSolution(state, goal) }
}

/** Counts full states, without rotation or mirror equivalence reduction. */
export function sliceDistanceDistribution(goal: SliceGoal): number[] {
  const { cumulative } = getTable(goal)
  return cumulative.map((count, d) => 12 * (count - (cumulative[d - 1] ?? 0)))
}

export function solveLsHalfTurns(cube: Cube, axis: LsAxis): string[] {
  return solveSliceHalfTurns(cube, { mode: 'ls', axis })
}

export function sampleLsState(axis: LsAxis, maxMoves = LS_MAX_DISTANCE, random: () => number = Math.random): LsPracticeState {
  return sampleSliceState({ mode: 'ls', axis }, maxMoves, random)
}

export function lsDistanceDistribution(axis: LsAxis): number[] {
  return sliceDistanceDistribution({ mode: 'ls', axis })
}
