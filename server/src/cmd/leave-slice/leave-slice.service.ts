import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { createHash } from 'crypto'
import { Repository } from 'typeorm'

import { LeaveSliceCases, LeaveSliceSolution } from '@/entities/leave-slice-cases.entity'
import { parseScramble } from '@/utils/thistlethwaite'

const BATCH_SIZE = 500
const MAX_SOLUTIONS_PER_CASE = 100

// ================================================================
// Permutation utilities
// ================================================================

function permMult(a: number[], b: number[]): number[] {
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
// Move permutations
// ================================================================

const FACES = 'URFDLB'

function buildMovePerms(): number[][] {
  const perms: number[][] = []
  for (let f = 0; f < 6; f++) {
    for (const s of ['', '2', "'"]) {
      perms.push(parseScramble(`${FACES[f]}${s}`))
    }
  }
  return perms
}

const HTR_MOVE_NAMES = ['U2', 'R2', 'F2', 'D2', 'L2', 'B2']
const HTR_MOVE_FACE = [0, 1, 2, 3, 4, 5] // U R F D L B
const HTR_MOVE_INDICES = [1, 4, 7, 10, 13, 16]

function isOppositeFace(a: number, b: number): boolean {
  return (a + 3) % 6 === b
}

/**
 * Normalize a solution by sorting consecutive commuting moves (opposite faces)
 * into canonical order: U2 before D2, R2 before L2, F2 before B2.
 */
function normalizeSolution(moves: string[]): string {
  const arr = moves.slice()
  let changed = true
  while (changed) {
    changed = false
    for (let i = 0; i < arr.length - 1; i++) {
      const a = HTR_MOVE_NAMES.indexOf(arr[i])
      const b = HTR_MOVE_NAMES.indexOf(arr[i + 1])
      if (a < 0 || b < 0) continue
      if (isOppositeFace(HTR_MOVE_FACE[a], HTR_MOVE_FACE[b]) && a > b) {
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
 * e.g. "R2 U2 D2 L2 U2 D2 D2 R2 U2" → "R2 U2 D2 L2 U2 R2 U2"
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

// ================================================================
// Symmetry permutations
// ================================================================

// prettier-ignore
const X2_PERM = [27,28,29,30,31,32,33,34,35,17,16,15,14,13,12,11,10,9,53,52,51,50,49,48,47,46,45,0,1,2,3,4,5,6,7,8,44,43,42,41,40,39,38,37,36,26,25,24,23,22,21,20,19,18]
// prettier-ignore
const Y2_PERM = [8,7,6,5,4,3,2,1,0,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,35,34,33,32,31,30,29,28,27,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26]
// prettier-ignore
const MIRROR_PERM = [2,1,0,5,4,3,8,7,6,38,37,36,41,40,39,44,43,42,20,19,18,23,22,21,26,25,24,29,28,27,32,31,30,35,34,33,11,10,9,14,13,12,17,16,15,47,46,45,50,49,48,53,52,51]

interface SymTransform { name: string; perm: number[] }

function buildSymmetries(): SymTransform[] {
  const x2y2 = permMult(X2_PERM, Y2_PERM)
  const rots: [string, number[]][] = [['e', ID54], ['x2', X2_PERM], ['y2', Y2_PERM], ['x2y2', x2y2]]
  const syms: SymTransform[] = []
  for (const [n, r] of rots) {
    syms.push({ name: n, perm: r })
    syms.push({ name: `${n}+m`, perm: permMult(r, MIRROR_PERM) })
  }
  return syms
}

function conjugate(state: number[], sym: number[]): number[] {
  return permMult(sym, permMult(state, permInv(sym)))
}

// ================================================================
// State key
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
  return p.join(',')
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
// LS definitions
// ================================================================

const LS_DEFS: [string, string][] = [
  ['solved', ''],
  ['3e', "U D' F2 U' D R2"],
  ['2e2eA', "R2 U2 D2 L2 U2 D2"],
  ['2e2eB', "F2 R2 U2 D2 L2 U2 D2 F2"],
]
const FOUR_X = "U D' F2 B2 U' D L2 R2"

@Injectable()
export class LeaveSliceCommandService {
  private readonly logger = new Logger(LeaveSliceCommandService.name)

  constructor(
    @InjectRepository(LeaveSliceCases)
    private readonly repository: Repository<LeaveSliceCases>,
  ) {}

  async seed(maxDepth = 13) {
    const existing = await this.repository.count()
    if (existing > 0) {
      this.logger.warn(`Table already has ${existing} rows. Run 'reset' first.`)
      return
    }

    const MOVE_PERMS = buildMovePerms()
    const HTR_MOVES = HTR_MOVE_INDICES.map(i => MOVE_PERMS[i])
    const symmetries = buildSymmetries()
    this.validateSymmetries(MOVE_PERMS)

    // Build LS seeds: key → { name, scramble, perm }
    const lsSeeds: { name: string; scramble: string; perm: number[] }[] = []
    for (const [name, scr] of LS_DEFS) {
      lsSeeds.push({ name, scramble: scr, perm: scr ? parseScramble(scr) : ID54.slice() })
      const combined = [scr, FOUR_X].filter(Boolean).join(' ')
      lsSeeds.push({ name: `${name}+4x`, scramble: combined, perm: parseScramble(combined) })
    }

    // Map from stateKey → LS origin info (for depth-0 states only)
    const lsOriginScramble = new Map<string, string>()
    for (const ls of lsSeeds) {
      const key = stateToKey(ls.perm)
      if (!lsOriginScramble.has(key)) {
        lsOriginScramble.set(key, ls.scramble)
      }
    }

    // ---- Phase 1: BFS ----
    this.logger.log('Phase 1: BFS')

    const depthMap = new Map<string, number>()
    let currentFrontier: number[][] = []

    for (const ls of lsSeeds) {
      const key = stateToKey(ls.perm)
      if (!depthMap.has(key)) {
        depthMap.set(key, 0)
        currentFrontier.push(ls.perm)
      }
    }

    // We don't store depth-0 perms since they won't be saved
    const frontiersByDepth: number[][][] = []
    this.logger.log(`Depth  0: ${currentFrontier.length} states (LS seeds, skipped)`)

    for (let depth = 1; depth <= maxDepth; depth++) {
      const nextFrontier: number[][] = []
      for (const state of currentFrontier) {
        for (const move of HTR_MOVES) {
          const np = permMult(move, state)
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

    this.logger.log(`BFS complete: ${depthMap.size} states`)

    // ---- Phase 2: Enumerate solutions & save per depth ----
    this.logger.log('Phase 2: Enumerate solutions & save')

    let caseId = 0
    let totalSaved = 0
    const symGroupFirst = new Map<string, number>()

    for (let di = 0; di < frontiersByDepth.length; di++) {
      const depth = di + 1
      const perms = frontiersByDepth[di]
      if (perms.length === 0) continue

      const batch: LeaveSliceCases[] = []

      for (const perm of perms) {
        caseId++

        const rawSolutions = new Set<string>()
        this.dfs(perm, depth, depthMap, HTR_MOVES, rawSolutions, [])

        const solutions: LeaveSliceSolution[] = [...rawSolutions].map(s => ({
          length: depth,
          solution: s,
        }))

        const setup = this.buildSetup(perm, depth, depthMap, HTR_MOVES, lsOriginScramble)
        const symGroup = md5(canonicalKey(perm, symmetries))

        const c = new LeaveSliceCases()
        c.caseId = caseId
        c.setup = setup
        c.optimalMoves = depth
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
      }

      if (batch.length > 0) {
        await this.repository.save(batch)
        totalSaved += batch.length
      }

      this.logger.log(`Depth ${depth}: saved ${perms.length} cases`)
      frontiersByDepth[di] = null as any
    }

    this.logger.log(`Done. ${totalSaved} cases, ${symGroupFirst.size} symmetry groups.`)
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
      .groupBy('c.optimalMoves')
      .orderBy('c.optimalMoves', 'ASC')
      .getRawMany<{ depth: string; total: string; unique: string }>()

    this.logger.log(' depth |  total | unique')
    this.logger.log('-------|--------|-------')
    let sumTotal = 0, sumUnique = 0
    for (const row of rows) {
      const t = Number(row.total), u = Number(row.unique)
      sumTotal += t
      sumUnique += u
      this.logger.log(` ${row.depth.padStart(5)} | ${String(t).padStart(6)} | ${String(u).padStart(5)}`)
    }
    this.logger.log('-------|--------|-------')
    this.logger.log(` total | ${String(sumTotal).padStart(6)} | ${String(sumUnique).padStart(5)}`)
  }

  /**
   * DFS backtracking to find all optimal solutions (HTR moves from case to any LS state).
   * Results are normalized and deduplicated via a Set.
   */
  private dfs(
    perm: number[],
    depth: number,
    depthMap: Map<string, number>,
    htrMoves: number[][],
    out: Set<string>,
    path: string[],
  ) {
    if (out.size >= MAX_SOLUTIONS_PER_CASE) return

    if (depth === 0) {
      out.add(normalizeSolution(path))
      return
    }

    for (let m = 0; m < htrMoves.length; m++) {
      const next = permMult(htrMoves[m], perm)
      if (depthMap.get(stateToKey(next)) === depth - 1) {
        path.push(HTR_MOVE_NAMES[m])
        this.dfs(next, depth - 1, depthMap, htrMoves, out, path)
        path.pop()
        if (out.size >= MAX_SOLUTIONS_PER_CASE) return
      }
    }
  }

  /**
   * Build a setup scramble that produces this case state when applied to a solved cube.
   * Traces back through BFS to an LS seed and prepends the LS seed's scramble.
   */
  private buildSetup(
    perm: number[],
    depth: number,
    depthMap: Map<string, number>,
    htrMoves: number[][],
    lsOriginScramble: Map<string, string>,
  ): string {
    const htrParts: string[] = []
    let current = perm
    for (let d = depth; d > 0; d--) {
      for (let m = 0; m < htrMoves.length; m++) {
        const prev = permMult(htrMoves[m], current)
        const key = stateToKey(prev)
        if (depthMap.get(key) === d - 1) {
          htrParts.unshift(HTR_MOVE_NAMES[m])
          current = prev
          break
        }
      }
    }

    const lsScramble = lsOriginScramble.get(stateToKey(current)) || ''
    const raw = [lsScramble, ...htrParts].filter(Boolean).join(' ')
    return simplifyMoves(raw)
  }

  private validateSymmetries(movePerms: number[][]) {
    const sources = HTR_MOVE_INDICES.map(i => movePerms[i])
    const checks: [string, number[], number[]][] = [
      ['x2', X2_PERM, [10, 4, 16, 1, 13, 7]],
      ['y2', Y2_PERM, [1, 13, 16, 10, 4, 7]],
      ['mirror', MIRROR_PERM, [1, 13, 7, 10, 4, 16]],
    ]
    for (const [name, sym, expectedIdx] of checks) {
      for (let i = 0; i < 6; i++) {
        if (!permEq(conjugate(sources[i], sym), movePerms[expectedIdx[i]])) {
          throw new Error(`Symmetry validation failed: ${name}`)
        }
      }
    }
  }
}
