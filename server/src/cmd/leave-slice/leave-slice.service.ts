import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { createHash } from 'crypto'
import { Repository } from 'typeorm'

import { LeaveSliceCases, LeaveSliceSolution, LeaveSliceSolutionType } from '@/entities/leave-slice-cases.entity'
import { isLeaveSliceState, parseScramble } from '@/utils/thistlethwaite'

const BATCH_SIZE = 500
const MAX_SOLUTIONS_PER_TYPE = 100
const SQUARE_GROUP_SIZE = 663552
const QT_SPHERE_RADIUS = 5
const DRB_SPHERE_RADIUS = 4

// ================================================================
// Permutation utilities
//
// Convention: a facelet permutation `s` maps position -> facelet, and
// appending a move M to a scramble state s yields compose(s, M), exactly
// matching parseScramble (which right-multiplies each token). All BFS/DFS
// below appends moves so that stored setups/solutions are valid when a
// user applies them after the setup on a solved cube.
// ================================================================

function compose(a: number[], b: number[]): number[] {
  const r = new Array(a.length)
  for (let i = 0; i < a.length; i++) r[i] = a[b[i]]
  return r
}

function permInv(a: number[]): number[] {
  const r = new Array(a.length)
  for (let i = 0; i < a.length; i++) r[a[i]] = i
  return r
}

function permEq(a: number[], b: number[]): boolean {
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false
  return true
}

const ID54 = Array.from({ length: 54 }, (_, i) => i)

// ================================================================
// Moves
// ================================================================

const FACES = 'URFDLB'

const MOVE_NAMES: string[] = []
const MOVE_PERMS: number[][] = []
for (const f of FACES) {
  for (const s of ['', '2', "'"]) {
    MOVE_NAMES.push(f + s)
    MOVE_PERMS.push(parseScramble(f + s))
  }
}

const HTR_MOVE_IDX = [1, 4, 7, 10, 13, 16] // U2 R2 F2 D2 L2 B2
const DR_MOVE_IDX = [0, 1, 2, 4, 7, 9, 10, 11, 13, 16] // U U2 U' R2 F2 D D2 D' L2 B2
const ALL_MOVE_IDX = Array.from({ length: 18 }, (_, i) => i)

function moveFace(moveIdx: number): number {
  return (moveIdx / 3) | 0
}

function isOppositeFace(a: number, b: number): boolean {
  return (a + 3) % 6 === b
}

/**
 * Normalize a solution by sorting adjacent commuting moves (opposite faces)
 * into canonical order: U-face before D-face, R before L, F before B.
 * Works for quarter turns as well (e.g. "L R'" -> "R' L").
 */
function normalizeSolution(moves: string[]): string {
  const arr = moves.slice()
  let changed = true
  while (changed) {
    changed = false
    for (let i = 0; i < arr.length - 1; i++) {
      const a = moveFace(MOVE_NAMES.indexOf(arr[i]))
      const b = moveFace(MOVE_NAMES.indexOf(arr[i + 1]))
      if (isOppositeFace(a, b) && a > b) {
        ;[arr[i], arr[i + 1]] = [arr[i + 1], arr[i]]
        changed = true
      }
    }
  }
  return arr.join(' ')
}

const MOVE_RE = /^([URFDLB])([2']?)$/
const POWER_SUFFIX = ['', '', '2', "'"]

/**
 * Simplify a move sequence by cancelling adjacent same-face moves.
 * Also swaps adjacent opposite-face moves when it exposes a cancellation.
 */
function simplifyMoves(moveStr: string): string {
  const tokens = moveStr.trim().split(/\s+/).filter(Boolean)
  const moves: [number, number][] = []
  for (const tok of tokens) {
    const m = MOVE_RE.exec(tok)
    if (!m) continue
    const face = FACES.indexOf(m[1])
    const power = m[2] === '2' ? 2 : m[2] === "'" ? 3 : 1
    moves.push([face, power])
  }

  let changed = true
  while (changed) {
    changed = false
    for (let i = 0; i < moves.length - 1; i++) {
      if (moves[i][0] === moves[i + 1][0]) {
        const p = (moves[i][1] + moves[i + 1][1]) % 4
        if (p === 0) {
          moves.splice(i, 2)
        } else {
          moves[i][1] = p
          moves.splice(i + 1, 1)
        }
        changed = true
        break
      }
      if (
        isOppositeFace(moves[i][0], moves[i + 1][0]) &&
        i + 2 < moves.length &&
        moves[i][0] === moves[i + 2][0]
      ) {
        ;[moves[i], moves[i + 1]] = [moves[i + 1], moves[i]]
        changed = true
        break
      }
    }
  }

  return moves.map(([f, p]) => `${FACES[f]}${POWER_SUFFIX[p]}`).join(' ')
}

const QT_TOKENS = new Set(['U', "U'", 'D', "D'"])

function containsQuarterTurn(solution: string): boolean {
  return solution.split(' ').some(tok => QT_TOKENS.has(tok))
}

// ================================================================
// Symmetries: the 16 transforms preserving the UD axis
// (y^k and x2*y^k rotations, each with optional RL mirror)
// ================================================================

// prettier-ignore
const X2_PERM = [27,28,29,30,31,32,33,34,35,17,16,15,14,13,12,11,10,9,53,52,51,50,49,48,47,46,45,0,1,2,3,4,5,6,7,8,44,43,42,41,40,39,38,37,36,26,25,24,23,22,21,20,19,18]
// prettier-ignore
const Y_PERM = [6,3,0,7,4,1,8,5,2,45,46,47,48,49,50,51,52,53,9,10,11,12,13,14,15,16,17,29,32,35,28,31,34,27,30,33,18,19,20,21,22,23,24,25,26,36,37,38,39,40,41,42,43,44]
// prettier-ignore
const MIRROR_PERM = [2,1,0,5,4,3,8,7,6,38,37,36,41,40,39,44,43,42,20,19,18,23,22,21,26,25,24,29,28,27,32,31,30,35,34,33,11,10,9,14,13,12,17,16,15,47,46,45,50,49,48,53,52,51]

interface SymTransform { name: string; perm: number[] }

function buildSymmetries(): SymTransform[] {
  const syms: SymTransform[] = []
  let yk = ID54.slice()
  for (let k = 0; k < 4; k++) {
    for (const [n, r] of [[`y${k}`, yk], [`x2y${k}`, compose(X2_PERM, yk)]] as [string, number[]][]) {
      syms.push({ name: n, perm: r })
      syms.push({ name: `${n}+m`, perm: compose(r, MIRROR_PERM) })
    }
    yk = compose(Y_PERM, yk)
  }
  return syms
}

function conjugate(state: number[], sym: number[]): number[] {
  return compose(compose(sym, state), permInv(sym))
}

// ================================================================
// State key (injective: the facelet value at a piece's reference
// sticker determines both the piece and its orientation)
// ================================================================

const cFacelet = [
  [8, 9, 20], [6, 18, 38], [0, 36, 47], [2, 45, 11],
  [29, 26, 15], [27, 44, 24], [33, 53, 42], [35, 17, 51],
]
const eFacelet = [
  [5, 10], [7, 19], [3, 37], [1, 46],
  [32, 16], [28, 25], [30, 43], [34, 52],
  [23, 12], [21, 41], [50, 39], [48, 14],
]

function stateToKey(perm: number[]): string {
  const p: number[] = []
  for (let c = 0; c < 8; c++) p.push(perm[cFacelet[c][0]])
  for (let e = 0; e < 12; e++) p.push(perm[eFacelet[e][0]])
  return String.fromCharCode(...p)
}

function canonicalKey(state: number[], symmetries: SymTransform[]): string {
  let minKey = stateToKey(state)
  for (let i = 1; i < symmetries.length; i++) {
    const key = stateToKey(conjugate(state, symmetries[i].perm))
    if (key < minKey) minKey = key
  }
  return minKey
}

function md5(input: string): string {
  return createHash('md5').update(input).digest('hex')
}

// ================================================================
// LS targets
//
// A leave-slice state = both UD layers solved relative to a whole-cube
// rotation about the UD axis (y^k, i.e. the E slice may be off by a
// quarter/half turn INCLUDING its centers), combined with any even
// permutation of the 4 slice edges (solved / 3-cycle / 2-2 swap).
//   - {e, y2} x 12 sigma = 24 states lie in the square group -> HTR BFS seeds.
//   - {y, y'} x 12 sigma = 24 quarter-slice states, only reachable with
//     U/D quarter turns -> extra goals for QT / DR-breaking solutions.
// ================================================================

const LAYER_FACELETS: number[] = []
for (let c = 0; c < 8; c++) for (const f of cFacelet[c]) LAYER_FACELETS.push(f)
for (let e = 0; e < 8; e++) for (const f of eFacelet[e]) LAYER_FACELETS.push(f)

const SLICE_POS = [8, 9, 10, 11]

/** State with both UD layers rotated by `rot` and slice+centers untouched. */
function layerState(rot: number[]): number[] {
  const t = ID54.slice()
  for (const i of LAYER_FACELETS) t[i] = rot[i]
  if (new Set(t).size !== 54) throw new Error('layerState: not a permutation')
  return t
}

function evenPermutationsOf4(): number[][] {
  const out: number[][] = []
  const perm = (arr: number[], acc: number[]) => {
    if (arr.length === 0) {
      let inv = 0
      for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) if (acc[i] > acc[j]) inv++
      if (inv % 2 === 0) out.push(acc.slice())
      return
    }
    for (let i = 0; i < arr.length; i++) {
      acc.push(arr[i])
      perm(arr.slice(0, i).concat(arr.slice(i + 1)), acc)
      acc.pop()
    }
  }
  perm([0, 1, 2, 3], [])
  return out
}

function buildTarget(rotPerm: number[], sigma: number[]): number[] {
  const t = layerState(rotPerm)
  for (let i = 0; i < 4; i++) {
    const pos = SLICE_POS[i]
    const piece = SLICE_POS[sigma[i]]
    t[eFacelet[pos][0]] = eFacelet[piece][0]
    t[eFacelet[pos][1]] = eFacelet[piece][1]
  }
  if (new Set(t).size !== 54) throw new Error('buildTarget: not a permutation')
  return t
}

interface LSTargets {
  /** All 48 LS goal states. */
  targetPerms: number[][]
  targetKeys: Set<string>
  /** The 24 square-group members ({e,y2} rotations), used as HTR BFS seeds. */
  seedPerms: number[][]
  seedKeys: Set<string>
}

function buildTargets(): LSTargets {
  const rots: { quarter: boolean; perm: number[] }[] = []
  let yk = ID54.slice()
  for (let k = 0; k < 4; k++) {
    rots.push({ quarter: k % 2 === 1, perm: yk.slice() })
    yk = compose(Y_PERM, yk)
  }
  const targetPerms: number[][] = []
  const targetKeys = new Set<string>()
  const seedPerms: number[][] = []
  const seedKeys = new Set<string>()
  for (const sigma of evenPermutationsOf4()) {
    for (const rot of rots) {
      const t = buildTarget(rot.perm, sigma)
      const key = stateToKey(t)
      if (targetKeys.has(key)) continue
      targetKeys.add(key)
      targetPerms.push(t)
      if (!rot.quarter) {
        seedPerms.push(t)
        seedKeys.add(key)
      }
    }
  }
  if (targetKeys.size !== 48 || seedKeys.size !== 24) {
    throw new Error(`buildTargets: expected 48/24 states, got ${targetKeys.size}/${seedKeys.size}`)
  }
  return { targetPerms, targetKeys, seedPerms, seedKeys }
}

@Injectable()
export class LeaveSliceCommandService {
  private readonly logger = new Logger(LeaveSliceCommandService.name)

  constructor(
    @InjectRepository(LeaveSliceCases)
    private readonly repository: Repository<LeaveSliceCases>,
  ) {}

  async seed(maxDepth = 8) {
    const existing = await this.repository.count()
    if (existing > 0) {
      this.logger.warn(`Table already has ${existing} rows. Run 'reset' first.`)
      return
    }

    const symmetries = buildSymmetries()
    const targets = buildTargets()
    this.validate(symmetries, targets)

    // ---- Phase 1: full square-group BFS from solved, to get a half-turn
    // scramble for each of the 24 seed states (used as setup prefixes).
    this.logger.log('Phase 1: square-group BFS from solved')
    const seedScrambles = this.buildSeedScrambles(targets)

    // ---- Phase 2: multi-source BFS from the 24 seeds (HTR metric) ----
    this.logger.log('Phase 2: BFS from 24 LS seeds')

    const depthMap = new Map<string, number>()
    let currentFrontier: number[][] = []
    for (const perm of targets.seedPerms) {
      const key = stateToKey(perm)
      if (!depthMap.has(key)) {
        depthMap.set(key, 0)
        currentFrontier.push(perm)
      }
    }
    this.logger.log(`Depth  0: ${currentFrontier.length} states (LS seeds, skipped)`)

    const frontiersByDepth: number[][][] = []
    for (let depth = 1; depth <= maxDepth; depth++) {
      const nextFrontier: number[][] = []
      for (const state of currentFrontier) {
        for (const mi of HTR_MOVE_IDX) {
          const np = compose(state, MOVE_PERMS[mi])
          const key = stateToKey(np)
          if (!depthMap.has(key)) {
            depthMap.set(key, depth)
            nextFrontier.push(np)
          }
        }
      }
      currentFrontier = nextFrontier
      frontiersByDepth.push(nextFrontier)
      this.logger.log(`Depth ${String(depth).padStart(2)}: ${nextFrontier.length} new (total ${depthMap.size})`)
      if (nextFrontier.length === 0) break
    }

    // ---- Phase 3: spheres around the 48 targets for QT / DR-breaking search ----
    this.logger.log('Phase 3: building solution spheres')
    const qtSphere = this.buildSphere(targets.targetPerms, DR_MOVE_IDX, QT_SPHERE_RADIUS)
    this.logger.log(`QT sphere (DR moves, radius ${QT_SPHERE_RADIUS}): ${qtSphere.size} states`)
    const drbSphere = this.buildSphere(targets.targetPerms, ALL_MOVE_IDX, DRB_SPHERE_RADIUS)
    this.logger.log(`DR-breaking sphere (18 moves, radius ${DRB_SPHERE_RADIUS}): ${drbSphere.size} states`)

    // ---- Phase 4: enumerate solutions & save per depth ----
    this.logger.log('Phase 4: enumerate solutions & save')

    let caseId = 0
    let totalSaved = 0
    let qtShorter = 0
    let drbCount = 0
    const symGroupFirst = new Map<string, number>()

    for (let di = 0; di < frontiersByDepth.length; di++) {
      const depth = di + 1
      const perms = frontiersByDepth[di]
      if (perms.length === 0) continue

      const batch: LeaveSliceCases[] = []

      for (const perm of perms) {
        caseId++

        const setup = this.buildSetup(perm, depth, depthMap, seedScrambles)

        // HTR solutions (half turns only), guided by depthMap
        const htrSet = new Set<string>()
        this.dfsHtr(perm, depth, depthMap, htrSet, [])
        const solutions: LeaveSliceSolution[] = [...htrSet].map(s => ({
          length: depth,
          solution: s,
          type: 'htr' as LeaveSliceSolutionType,
        }))

        // QT solutions (DR moves: U/D quarter turns allowed)
        const qt = this.solveWithSphere(perm, DR_MOVE_IDX, qtSphere, QT_SPHERE_RADIUS, depth)
        if (!qt) throw new Error(`QT search failed for case ${caseId} [${setup}]`)
        if (qt.length < depth) qtShorter++
        for (const s of qt.solutions) {
          if (!containsQuarterTurn(s)) continue
          solutions.push({ length: qt.length, solution: s, type: 'ud-qt' })
        }

        // DR-breaking solutions, only when strictly shorter than the QT optimum
        let drbOptimal: number | null = null
        if (qt.length > 0) {
          const drb = this.solveWithSphere(perm, ALL_MOVE_IDX, drbSphere, DRB_SPHERE_RADIUS, qt.length - 1)
          if (drb) {
            drbOptimal = drb.length
            drbCount++
            for (const s of drb.solutions) {
              solutions.push({ length: drb.length, solution: s, type: 'dr-breaking' })
            }
          }
        }

        // Gold verification against parseScramble semantics: sampled cases + all DR-breaking
        if (caseId % 1000 === 1 || drbOptimal !== null) {
          this.verifyCase(setup, perm, solutions, targets)
        }

        const symGroup = md5(canonicalKey(perm, symmetries))

        const c = new LeaveSliceCases()
        c.caseId = caseId
        c.setup = setup
        c.optimalMoves = depth
        c.qtOptimalMoves = qt.length
        c.drBreakingOptimalMoves = drbOptimal
        c.solutions = solutions
        c.symmetryGroup = symGroup
        c.isSymmetryRepresentative = !symGroupFirst.has(symGroup)
        if (c.isSymmetryRepresentative) symGroupFirst.set(symGroup, caseId)

        batch.push(c)

        if (batch.length >= BATCH_SIZE) {
          await this.repository.save(batch)
          totalSaved += batch.length
          batch.length = 0
        }
        if (caseId % 10000 === 0) {
          this.logger.log(`  ... ${caseId} cases processed`)
        }
      }

      if (batch.length > 0) {
        await this.repository.save(batch)
        totalSaved += batch.length
      }

      this.logger.log(`Depth ${depth}: saved ${perms.length} cases`)
      frontiersByDepth[di] = null as any
    }

    this.logger.log(
      `Done. ${totalSaved} cases, ${symGroupFirst.size} symmetry groups, ` +
      `${qtShorter} with shorter QT solutions, ${drbCount} with shorter DR-breaking solutions.`,
    )
  }

  async reset() {
    const count = await this.repository.count()
    if (count === 0) {
      this.logger.log('Table is already empty.')
      return
    }
    await this.repository.clear()
    this.logger.log(`Deleted ${count} cases.`)
  }

  async printStats() {
    const rows = await this.repository
      .createQueryBuilder('c')
      .select('c.optimalMoves', 'depth')
      .addSelect('COUNT(*)', 'total')
      .addSelect('SUM(CASE WHEN c.isSymmetryRepresentative THEN 1 ELSE 0 END)', 'unique')
      .addSelect('SUM(CASE WHEN c.qtOptimalMoves < c.optimalMoves THEN 1 ELSE 0 END)', 'qtShorter')
      .addSelect('SUM(CASE WHEN c.drBreakingOptimalMoves IS NOT NULL THEN 1 ELSE 0 END)', 'drBreaking')
      .groupBy('c.optimalMoves')
      .orderBy('c.optimalMoves', 'ASC')
      .getRawMany<{ depth: string; total: string; unique: string; qtShorter: string; drBreaking: string }>()

    this.logger.log(' depth |  total | unique | qt< | drb')
    this.logger.log('-------|--------|--------|-----|-----')
    let sumTotal = 0, sumUnique = 0, sumQt = 0, sumDrb = 0
    for (const row of rows) {
      const t = Number(row.total), u = Number(row.unique), q = Number(row.qtShorter), b = Number(row.drBreaking)
      sumTotal += t
      sumUnique += u
      sumQt += q
      sumDrb += b
      this.logger.log(
        ` ${row.depth.padStart(5)} | ${String(t).padStart(6)} | ${String(u).padStart(6)} | ${String(q).padStart(3)} | ${String(b).padStart(3)}`,
      )
    }
    this.logger.log('-------|--------|--------|-----|-----')
    this.logger.log(` total | ${String(sumTotal).padStart(6)} | ${String(sumUnique).padStart(6)} | ${String(sumQt).padStart(3)} | ${String(sumDrb).padStart(3)}`)
  }

  // ================================================================
  // Validation
  // ================================================================

  private validate(symmetries: SymTransform[], targets: LSTargets) {
    if (symmetries.length !== 16) throw new Error('Expected 16 symmetries')

    // Each symmetry must map each move set onto itself.
    for (const sym of symmetries) {
      for (const [name, idxSet] of [['HTR', HTR_MOVE_IDX], ['DR', DR_MOVE_IDX], ['ALL', ALL_MOVE_IDX]] as [string, number[]][]) {
        for (const mi of idxSet) {
          const conj = conjugate(MOVE_PERMS[mi], sym.perm)
          if (!idxSet.some(mj => permEq(MOVE_PERMS[mj], conj))) {
            throw new Error(`Symmetry ${sym.name} does not preserve ${name} move set (${MOVE_NAMES[mi]})`)
          }
        }
      }
    }

    // Target/seed sets must be closed under all symmetries (guarantees that
    // states in one symmetry group share identical htr/qt/drb optima).
    for (const t of targets.targetPerms) {
      for (const sym of symmetries) {
        const key = stateToKey(conjugate(t, sym.perm))
        if (!targets.targetKeys.has(key)) throw new Error(`Target set not closed under ${sym.name}`)
      }
    }
    for (const s of targets.seedPerms) {
      for (const sym of symmetries) {
        const key = stateToKey(conjugate(s, sym.perm))
        if (!targets.seedKeys.has(key)) throw new Error(`Seed set not closed under ${sym.name}`)
      }
    }

    // Seeds must agree with the runtime checker (the reverse does not hold:
    // isLeaveSliceState also loosely accepts x2/z2-rotated fake-LS states).
    for (const s of targets.seedPerms) {
      if (!isLeaveSliceState(s, 'ud')) throw new Error('Seed state rejected by isLeaveSliceState')
    }
  }

  /**
   * BFS over the whole square group from solved (half turns only), returning a
   * half-turn scramble for each of the 24 seed states, keyed by state key.
   */
  private buildSeedScrambles(targets: LSTargets): Map<string, string> {
    const parent = new Map<string, [number, string] | null>()
    const k0 = stateToKey(ID54)
    parent.set(k0, null)
    let frontier: [string, number[]][] = [[k0, ID54.slice()]]
    while (frontier.length > 0) {
      const next: [string, number[]][] = []
      for (const [key, perm] of frontier) {
        for (const mi of HTR_MOVE_IDX) {
          const np = compose(perm, MOVE_PERMS[mi])
          const nk = stateToKey(np)
          if (!parent.has(nk)) {
            parent.set(nk, [mi, key])
            next.push([nk, np])
          }
        }
      }
      frontier = next
    }
    if (parent.size !== SQUARE_GROUP_SIZE) {
      throw new Error(`Square group BFS found ${parent.size} states, expected ${SQUARE_GROUP_SIZE}`)
    }

    const scrambles = new Map<string, string>()
    for (const perm of targets.seedPerms) {
      const key = stateToKey(perm)
      if (!parent.has(key)) throw new Error('LS seed not in square group')
      const moves: string[] = []
      let cur = key
      while (true) {
        const p = parent.get(cur)
        if (!p) break
        moves.unshift(MOVE_NAMES[p[0]])
        cur = p[1]
      }
      const scramble = moves.join(' ')
      if (!permEq(parseScramble(scramble), perm)) throw new Error('Seed scramble reconstruction mismatch')
      scrambles.set(key, scramble)
    }
    this.logger.log(`Square group: ${parent.size} states, ${scrambles.size} seed scrambles`)
    return scrambles
  }

  private verifyCase(setup: string, perm: number[], solutions: LeaveSliceSolution[], targets: LSTargets) {
    if (!permEq(parseScramble(setup), perm)) {
      throw new Error(`Setup does not reproduce case state: [${setup}]`)
    }
    for (const sol of solutions) {
      const final = parseScramble(`${setup} ${sol.solution}`)
      if (!targets.targetKeys.has(stateToKey(final))) {
        throw new Error(`Solution does not reach an LS state: [${setup}] + [${sol.solution}] (${sol.type})`)
      }
    }
  }

  // ================================================================
  // Solvers
  // ================================================================

  /**
   * DFS backtracking to find all optimal half-turn solutions
   * (moves appended from case towards any LS seed).
   */
  private dfsHtr(
    perm: number[],
    depth: number,
    depthMap: Map<string, number>,
    out: Set<string>,
    path: string[],
  ) {
    if (out.size >= MAX_SOLUTIONS_PER_TYPE) return

    if (depth === 0) {
      out.add(normalizeSolution(path))
      return
    }

    for (const mi of HTR_MOVE_IDX) {
      const next = compose(perm, MOVE_PERMS[mi])
      if (depthMap.get(stateToKey(next)) === depth - 1) {
        path.push(MOVE_NAMES[mi])
        this.dfsHtr(next, depth - 1, depthMap, out, path)
        path.pop()
        if (out.size >= MAX_SOLUTIONS_PER_TYPE) return
      }
    }
  }

  /** Backward BFS ball of given radius around the target states. */
  private buildSphere(targetPerms: number[][], moveIdx: number[], radius: number): Map<string, number> {
    const sphere = new Map<string, number>()
    let frontier: number[][] = []
    for (const t of targetPerms) {
      const key = stateToKey(t)
      if (!sphere.has(key)) {
        sphere.set(key, 0)
        frontier.push(t)
      }
    }
    for (let d = 1; d <= radius; d++) {
      const next: number[][] = []
      for (const perm of frontier) {
        for (const mi of moveIdx) {
          const np = compose(perm, MOVE_PERMS[mi])
          const key = stateToKey(np)
          if (!sphere.has(key)) {
            sphere.set(key, d)
            next.push(np)
          }
        }
      }
      frontier = next
    }
    return sphere
  }

  /**
   * Find the minimum solution length <= maxLen from `start` to any target and
   * enumerate all optimal solutions: forward DFS up to (maxLen - radius) moves,
   * then descend through the sphere. Returns null if nothing within maxLen.
   */
  private solveWithSphere(
    start: number[],
    moveIdx: number[],
    sphere: Map<string, number>,
    radius: number,
    maxLen: number,
  ): { length: number; solutions: string[] } | null {
    if (maxLen < 0) return null
    let best = Infinity
    const maxF = Math.max(0, maxLen - radius)

    const scan = (perm: number[], f: number, lastFace: number) => {
      const b = sphere.get(stateToKey(perm))
      if (b !== undefined && f + b < best && f + b <= maxLen) best = f + b
      if (f >= maxF || f + 1 >= best) return
      for (const mi of moveIdx) {
        const face = moveFace(mi)
        if (face === lastFace) continue
        // canonical order for adjacent commuting moves is enough here (pass 1
        // only needs the optimal length, not every path)
        if (isOppositeFace(face, lastFace) && face > lastFace) continue
        scan(compose(perm, MOVE_PERMS[mi]), f + 1, face)
      }
    }
    scan(start, 0, -1)
    if (best === Infinity) return null

    const sols = new Set<string>()
    const descend = (perm: number[], b: number, path: string[]) => {
      if (sols.size >= MAX_SOLUTIONS_PER_TYPE) return
      if (b === 0) {
        sols.add(normalizeSolution(path))
        return
      }
      for (const mi of moveIdx) {
        const np = compose(perm, MOVE_PERMS[mi])
        if (sphere.get(stateToKey(np)) === b - 1) {
          path.push(MOVE_NAMES[mi])
          descend(np, b - 1, path)
          path.pop()
        }
      }
    }
    const enumerate = (perm: number[], f: number, lastFace: number, path: string[]) => {
      if (sols.size >= MAX_SOLUTIONS_PER_TYPE) return
      const b = sphere.get(stateToKey(perm))
      if (b !== undefined && f + b === best) descend(perm, b, path)
      if (f >= maxF || f + 1 > best) return
      for (const mi of moveIdx) {
        const face = moveFace(mi)
        if (face === lastFace) continue
        path.push(MOVE_NAMES[mi])
        enumerate(compose(perm, MOVE_PERMS[mi]), f + 1, face, path)
        path.pop()
      }
    }
    enumerate(start, 0, -1, [])
    return { length: best, solutions: [...sols] }
  }

  /**
   * Build a setup scramble producing this case state on a solved cube:
   * seed scramble followed by the BFS path from the seed (half turns are
   * self-inverse, so walking back just appends the same move).
   */
  private buildSetup(
    perm: number[],
    depth: number,
    depthMap: Map<string, number>,
    seedScrambles: Map<string, string>,
  ): string {
    const htrParts: string[] = []
    let current = perm
    for (let d = depth; d > 0; d--) {
      let found = false
      for (const mi of HTR_MOVE_IDX) {
        const prev = compose(current, MOVE_PERMS[mi])
        if (depthMap.get(stateToKey(prev)) === d - 1) {
          htrParts.unshift(MOVE_NAMES[mi])
          current = prev
          found = true
          break
        }
      }
      if (!found) throw new Error('buildSetup: no descending move found')
    }

    const seedScramble = seedScrambles.get(stateToKey(current))
    if (seedScramble === undefined) throw new Error('buildSetup: path does not end at an LS seed')
    const raw = [seedScramble, ...htrParts].filter(Boolean).join(' ')
    return simplifyMoves(raw)
  }
}
