import { Algorithm, Cube } from 'insertionfinder'

/**
 * Thistlethwaite solver for FMC (Fewest Moves Challenge).
 *
 * Solves a Rubik's Cube phase by phase: EO → DR → HTR, finding all optimal
 * solutions at each step. Based on Schreier-Sims group theory and IDA* / dissection search.
 *
 * ## Quick start
 *
 * ```ts
 * import { solveEO, solveDR, solveHTR } from '@/utils/thistlethwaite'
 *
 * // 1. Solve EO (Edge Orientation) from a scramble
 * const eo = solveEO("R' U' F L2 D2 R2 ... R' U' F")
 * // Returns StepSolutions[] grouped by axis (fb / ud / rl)
 * // Each has: axis, effectiveLength, solutions[]
 *
 * // 2. Solve DR (Domino Reduction) from the EO-solved state
 * //    scramble = original scramble + chosen EO solution
 * //    lastMove = last move of the EO solution (for move cancellation)
 * const dr = solveDR("R' U' F ... U2 D' R' F' B'", { lastMove: "B'" })
 *
 * // 3. Solve HTR (Half-Turn Reduction) from the DR-solved state
 * //    scramble = original scramble + EO sol + DR sol
 * //    lastMove = last move of the DR solution
 * const htr = solveHTR("R' U' F ... B' L U L F2 U'", { lastMove: "U'" })
 * ```
 *
 * ## Options
 *
 * All three functions accept a `SolveOptions` object:
 * - `useNiss: boolean` — Enable NISS (Normal-Inverse Scramble Switching).
 *   Solutions may contain `@` separator: moves before `@` are pre-moves
 *   (applied before the scramble), moves after `@` are normal moves.
 *   Example: `"F' @ D' F' B'"` means apply `F'` before scramble, then `D' F' B'` after.
 *   To build the combined state: `solution.replace('@', scramble)`.
 *   NISS finds shorter solutions but takes ~100-300ms per step.
 * - `maxSolutions: number` — Stop early after finding this many solutions per axis.
 *   Significantly speeds up steps that produce many results (e.g. HTR).
 *
 * ## Move cancellation
 *
 * When `lastMove` is provided for DR/HTR, the solver considers cancellation
 * between the previous step's last move and the current step's first move.
 * For example, if lastMove is `R` and a solution starts with `R2`, they
 * combine to `R'` (saving 1 move). The `effectiveLength` reflects this.
 * The solver searches up to 2 extra depths to find solutions that cancel better.
 *
 * ## Axes
 *
 * Each step tries multiple reference-frame conjugations:
 * - EO: fb, ud, rl (3 axes)
 * - DR: ud, rl, fb (6 orientations, labeled as 3 axis pairs)
 * - HTR: ud, fb, rl (3 axes)
 *
 * The axis in the result indicates which reference frame was used.
 * Not all DR→HTR axis combinations are compatible; pick HTR results
 * that return solutions.
 *
 * ## Performance (typical, after first-call table init ~180ms)
 *
 * | Step         | no NISS   | NISS       |
 * |--------------|-----------|------------|
 * | EO           | <1ms      | ~100ms     |
 * | DR           | ~20ms     | ~130ms     |
 * | HTR          | <1ms      | ~300ms     |
 */

/** Per-axis results from a solve step. */
export interface StepSolutions {
  /** Reference-frame axis label: 'fb', 'ud', or 'rl' */
  axis: string
  /** All optimal solutions (move strings). May contain '@' for NISS separator. */
  solutions: string[]
  /** Effective move count (after cancellation with previous step's last move). */
  effectiveLength: number
}

// ================================================================
// Permutation utilities
// ================================================================

function permMult(a: number[], b: number[]): number[] {
  const ret = new Array(a.length)
  for (let i = 0; i < a.length; i++) ret[i] = b[a[i]]
  return ret
}

function permInv(perm: number[]): number[] {
  const ret = new Array(perm.length)
  for (let i = 0; i < perm.length; i++) ret[perm[i]] = i
  return ret
}

// ================================================================
// CubieCube operations for generating move/rotation permutations
// ================================================================

interface CubieState {
  ca: number[]
  ea: number[]
  ct?: number[]
}

function cubieMult(a: CubieState, b: CubieState): CubieState {
  const ca = new Array(8)
  const ea = new Array(12)
  for (let c = 0; c < 8; c++) {
    const ori = ((a.ca[b.ca[c] & 7] >> 3) + (b.ca[c] >> 3)) % 3
    ca[c] = (a.ca[b.ca[c] & 7] & 7) | (ori << 3)
  }
  for (let e = 0; e < 12; e++) {
    ea[e] = a.ea[b.ea[e] >> 1] ^ (b.ea[e] & 1)
  }
  return { ca, ea }
}

function centMult(a: CubieState, b: CubieState): number[] {
  const ct = new Array(6)
  for (let i = 0; i < 6; i++) ct[i] = a.ct![b.ct![i]]
  return ct
}

function cubieHash(s: CubieState): number {
  let ret = 0
  for (let i = 0; i < 20; i++) ret = (ret * 31 + (i < 12 ? s.ea[i] : s.ca[i - 12])) | 0
  return ret
}

const cFacelet = [
  [8, 9, 20],
  [6, 18, 38],
  [0, 36, 47],
  [2, 45, 11],
  [29, 26, 15],
  [27, 44, 24],
  [33, 53, 42],
  [35, 17, 51],
]
const eFacelet = [
  [5, 10],
  [7, 19],
  [3, 37],
  [1, 46],
  [32, 16],
  [28, 25],
  [30, 43],
  [34, 52],
  [23, 12],
  [21, 41],
  [50, 39],
  [48, 14],
]
const ctFacelet = [4, 13, 22, 31, 40, 49]

function cubieToPerm(s: CubieState, centerPerm?: number[]): number[] {
  const f: number[] = Array.from({ length: 54 }, (_, i) => i)
  if (centerPerm) {
    for (let i = 0; i < 6; i++) f[ctFacelet[i]] = ctFacelet[centerPerm[i]]
  }
  for (let c = 0; c < 8; c++) {
    const j = s.ca[c] & 7
    const ori = s.ca[c] >> 3
    for (let n = 0; n < 3; n++) f[cFacelet[c][(n + ori) % 3]] = cFacelet[j][n]
  }
  for (let e = 0; e < 12; e++) {
    const j = s.ea[e] >> 1
    const ori = s.ea[e] & 1
    for (let n = 0; n < 2; n++) f[eFacelet[e][(n + ori) % 2]] = eFacelet[j][n]
  }
  return f
}

// ================================================================
// Generate 18 move permutations and 24 rotation permutations
// ================================================================

const BASE_MOVES: [number[], number[]][] = [
  [
    [3, 0, 1, 2, 4, 5, 6, 7],
    [6, 0, 2, 4, 8, 10, 12, 14, 16, 18, 20, 22],
  ], // U
  [
    [20, 1, 2, 8, 15, 5, 6, 19],
    [16, 2, 4, 6, 22, 10, 12, 14, 8, 18, 20, 0],
  ], // R
  [
    [9, 21, 2, 3, 16, 12, 6, 7],
    [0, 19, 4, 6, 8, 17, 12, 14, 3, 11, 20, 22],
  ], // F
  [
    [0, 1, 2, 3, 5, 6, 7, 4],
    [0, 2, 4, 6, 10, 12, 14, 8, 16, 18, 20, 22],
  ], // D
  [
    [0, 10, 22, 3, 4, 17, 13, 7],
    [0, 2, 20, 6, 8, 10, 18, 14, 16, 4, 12, 22],
  ], // L
  [
    [0, 1, 11, 23, 4, 5, 18, 14],
    [0, 2, 4, 23, 8, 10, 12, 21, 16, 18, 7, 15],
  ], // B
]

function buildMovePerms(): number[][] {
  const cubies: CubieState[] = []
  for (let a = 0; a < 6; a++) {
    const base: CubieState = { ca: BASE_MOVES[a][0], ea: BASE_MOVES[a][1] }
    cubies[a * 3] = base
    cubies[a * 3 + 1] = cubieMult(base, base)
    cubies[a * 3 + 2] = cubieMult(cubies[a * 3 + 1], base)
  }
  return cubies.map(c => cubieToPerm(c))
}

const MOVE_PERMS = buildMovePerms()

function buildRotations() {
  const u4: CubieState = {
    ca: [3, 0, 1, 2, 7, 4, 5, 6],
    ea: [6, 0, 2, 4, 14, 8, 10, 12, 23, 17, 19, 21],
    ct: [0, 5, 1, 3, 2, 4],
  }
  const f2: CubieState = {
    ca: [5, 4, 7, 6, 1, 0, 3, 2],
    ea: [12, 10, 8, 14, 4, 2, 0, 6, 18, 16, 22, 20],
    ct: [3, 4, 2, 0, 1, 5],
  }
  const urf: CubieState = {
    ca: [8, 20, 13, 17, 19, 15, 22, 10],
    ea: [3, 16, 11, 18, 7, 22, 15, 20, 1, 9, 13, 5],
    ct: [2, 0, 1, 5, 3, 4],
  }

  let c: CubieState = {
    ca: [0, 1, 2, 3, 4, 5, 6, 7],
    ea: [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22],
    ct: [0, 1, 2, 3, 4, 5],
  }
  const rots: CubieState[] = []
  for (let i = 0; i < 24; i++) {
    rots[i] = { ca: c.ca.slice(), ea: c.ea.slice(), ct: c.ct!.slice() }
    let d = cubieMult(c, u4)
    d.ct = centMult(c, u4)
    c = { ca: d.ca, ea: d.ea, ct: d.ct }
    if (i % 4 === 3) {
      d = cubieMult(c, f2)
      d.ct = centMult(c, f2)
      c = { ca: d.ca, ea: d.ea, ct: d.ct }
    }
    if (i % 8 === 7) {
      d = cubieMult(c, urf)
      d.ct = centMult(c, urf)
      c = { ca: d.ca, ea: d.ea, ct: d.ct }
    }
  }

  const rotHash = rots.map(r => cubieHash(r))
  const moveCubies: CubieState[] = []
  for (let a = 0; a < 6; a++) {
    const base: CubieState = { ca: BASE_MOVES[a][0], ea: BASE_MOVES[a][1] }
    moveCubies[a * 3] = base
    moveCubies[a * 3 + 1] = cubieMult(base, base)
    moveCubies[a * 3 + 2] = cubieMult(moveCubies[a * 3 + 1], base)
  }

  const rotMulI: number[][] = Array.from({ length: 24 }, () => new Array(24))
  for (let i = 0; i < 24; i++) {
    for (let j = 0; j < 24; j++) {
      const p = cubieMult(rots[i], rots[j])
      const k = rotHash.indexOf(cubieHash(p))
      rotMulI[k][j] = i
    }
  }

  function rotPerm(ori: number): number[] {
    const rot = rots[rotMulI[0][ori]]
    const id: CubieState = {
      ca: [0, 1, 2, 3, 4, 5, 6, 7],
      ea: [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22],
    }
    const obj = cubieMult(id, rot)
    return cubieToPerm(obj, rot.ct)
  }

  return { rotPerm }
}

const rotations = buildRotations()

// ================================================================
// Scramble parsing and move utilities
// ================================================================

const FACES = 'URFDLB'
const MOVE_RE = /^([URFDLB])(['2]?)$/

export function parseScramble(scramble: string): number[] {
  let perm = Array.from({ length: 54 }, (_, i) => i)
  const tokens = scramble.trim().split(/\s+/).filter(Boolean)
  for (const tok of tokens) {
    const m = MOVE_RE.exec(tok)
    if (!m) continue
    const face = FACES.indexOf(m[1])
    const ps = m[2]
    const idx = face * 3 + (ps === '2' ? 1 : ps === "'" ? 2 : 0)
    perm = permMult(MOVE_PERMS[idx], perm)
  }
  return perm
}

function areOpposite(a: number, b: number): boolean {
  return (a + 3) % 6 === b
}

function calculateCancellation(lastMove: { face: number; pow: number } | null, solution: string[]): number {
  if (!lastMove || solution.length === 0) return 0
  const atIdx = solution.indexOf('@')
  const normalStart = atIdx >= 0 ? atIdx + 1 : 0
  if (normalStart >= solution.length) return 0
  const first = parseMoveStr(solution[normalStart])
  if (!first) return 0
  if (first.face === lastMove.face) {
    return (lastMove.pow + first.pow) % 4 === 0 ? 2 : 1
  }
  if (areOpposite(lastMove.face, first.face) && normalStart + 1 < solution.length) {
    const second = parseMoveStr(solution[normalStart + 1])
    if (second && second.face === lastMove.face) {
      return (lastMove.pow + second.pow) % 4 === 0 ? 2 : 1
    }
  }
  return 0
}

function parseMoveStr(s: string): { face: number; pow: number } | null {
  const m = MOVE_RE.exec(s)
  if (!m) return null
  const face = FACES.indexOf(m[1])
  const ps = m[2]
  return { face, pow: ps === '2' ? 2 : ps === "'" ? 3 : 1 }
}

// ================================================================
// SchreierSims
// ================================================================

class SchreierSims {
  sgs: (number[] | undefined)[][]
  sgsi: (number[] | undefined)[][]
  t2i: (number | undefined)[][]
  i2t: number[][]
  keyIdx: number[]
  Tk: number[][][]
  e: number[]

  constructor(genOrCopy: number[][] | SchreierSims, shuffle?: number[]) {
    if (genOrCopy instanceof SchreierSims) {
      const src = genOrCopy
      const n = src.e.length
      this.e = src.e
      this.keyIdx = src.keyIdx.slice()
      this.sgs = []
      this.sgsi = []
      this.t2i = []
      this.i2t = []
      this.Tk = []
      for (let i = 0; i < n; i++) {
        this.sgs[i] = src.sgs[i].slice()
        this.sgsi[i] = src.sgsi[i].slice()
        this.t2i[i] = src.t2i[i].slice()
        this.i2t[i] = src.i2t[i].slice()
        this.Tk[i] = src.Tk[i].slice()
      }
      return
    }
    const gen = genOrCopy
    const n = gen[0].length
    this.e = Array.from({ length: n }, (_, i) => i)
    this.sgs = []
    this.sgsi = []
    this.t2i = []
    this.i2t = []
    this.keyIdx = []
    this.Tk = []
    for (let i = 0; i < n; i++) {
      this.sgs[i] = []
      this.sgsi[i] = []
      this.t2i[i] = []
      this.i2t[i] = [i]
      this.Tk[i] = []
      this.sgs[i][i] = this.e
      this.sgsi[i][i] = this.e
      this.t2i[i][i] = 0
    }
    this.extend(gen, shuffle)
  }

  extend(gen: number[][], shuffle?: number[]) {
    for (let i = 0; i < gen.length; i++) {
      let g = gen[i]
      if (shuffle) g = permMult(permMult(permInv(shuffle), g), shuffle)
      if (this.isMember(g) < 0) this.knutha(this.e.length - 1, g)
    }
  }

  knutha(k: number, p: number[]) {
    this.Tk[k].push(p)
    for (let i = 0; i < this.sgs[k].length; i++) {
      if (this.sgs[k][i]) this.knuthb(k, permMult(this.sgs[k][i]!, p))
    }
  }

  knuthb(k: number, p: number[]) {
    const j = p[k]
    if (!this.sgs[k][j]) {
      this.sgs[k][j] = p
      this.sgsi[k][j] = permInv(p)
      this.t2i[k][j] = this.i2t[k].length
      this.i2t[k].push(j)
      if (this.i2t[k].length === 2) {
        this.keyIdx.push(k)
        this.keyIdx.sort((a, b) => b - a)
      }
      for (let i = 0; i < this.Tk[k].length; i++) {
        this.knuthb(k, permMult(p, this.Tk[k][i]))
      }
      return
    }
    const p2 = permMult(p, this.sgsi[k][j]!)
    if (this.isMember(p2) < 0) this.knutha(k - 1, p2)
  }

  isMember(p: number[], depth?: number): number {
    depth = depth || 0
    let idx = 0
    const ps: number[][] = []
    for (let i = p.length - 1; i >= depth; i--) {
      let j = p[i]
      for (let k = 0; k < ps.length; k++) j = ps[k][j]
      if (j !== i) {
        if (!this.sgs[i][j]) return -1
        ps.push(this.sgsi[i][j]!)
      }
      idx = idx * this.i2t[i].length + (this.t2i[i][j] ?? 0)
    }
    return idx
  }

  size(): number {
    let s = 1
    for (let j = 0; j < this.sgs.length; j++) s *= this.i2t[j].length
    return s
  }

  toKeyIdx(perm?: number[]): number[] {
    perm = perm || this.e
    const ret: number[] = []
    for (let i = 0; i < this.keyIdx.length; i++) ret[i] = perm[this.keyIdx[i]]
    return ret
  }

  isSubgroupMemberByKey(permKey: number[], sgsH: SchreierSims): number {
    let idx = 0
    const ps: number[][] = []
    for (let ii = 0; ii < this.keyIdx.length; ii++) {
      const i = this.keyIdx[ii]
      let j = permKey[ii]
      for (let k = 0; k < ps.length; k++) j = ps[k][j]
      if (j !== i) {
        if (!sgsH.sgs[i][j]) return -1
        ps.push(sgsH.sgsi[i][j]!)
      }
      idx = idx * sgsH.i2t[i].length + (sgsH.t2i[i][j] ?? 0)
    }
    return idx
  }

  minElem(p: number[]): number[] {
    p = permInv(p)
    for (let ii = 0; ii < this.keyIdx.length; ii++) {
      const i = this.keyIdx[ii]
      let maxi = p[i]
      let j = i
      for (let k = 1; k < this.i2t[i].length; k++) {
        const m = this.i2t[i][k]
        if (p[m] > maxi) {
          maxi = p[m]
          j = m
        }
      }
      if (j !== i) p = permMult(this.sgs[i][j]!, p)
    }
    return permInv(p)
  }
}

// ================================================================
// CanonSeqGen
// ================================================================

class CanonSeqGen {
  gens: number[][]
  glen: number
  trieNodes: (number[] | null)[]
  skipSeqs: number[][]

  constructor(gens: number[][]) {
    this.gens = gens
    this.glen = gens.length
    this.trieNodes = [null, []]
    this.skipSeqs = []
  }

  addSkipSeq(seq: number[]) {
    this.skipSeqs.push(seq.slice())
    let node = 1
    for (let i = 0; i < seq.length; i++) {
      const next = ~~(this.trieNodes[node]![seq[i]] ?? 0)
      if (next === -1) return
      if (i === seq.length - 1) {
        this.trieNodes[node]![seq[i]] = -1
        break
      }
      if (next <= 0) {
        const nn = this.trieNodes.length
        this.trieNodes.push([])
        this.trieNodes[node]![seq[i]] = nn
        for (let m = 0; m < this.glen; m++) {
          this.updateNext(seq.slice(0, i + 1).concat(m))
        }
        node = nn
      } else {
        node = next
      }
    }
  }

  traversalTrie(node: number, seq: number[], callback: (node: number, seq: number[]) => void) {
    if (node <= 0) return
    for (let i = 0; i < this.glen; i++) {
      seq.push(i)
      this.traversalTrie(~~(this.trieNodes[node]![i] ?? 0), seq, callback)
      seq.pop()
    }
    callback(node, seq)
  }

  updateNext(seq: number[]): number {
    let node = 1
    for (let i = 0; i < seq.length; i++) {
      let next = ~~(this.trieNodes[node]![seq[i]] ?? 0)
      if (next === 0) {
        next = this.updateNext(seq.slice(1, i + 1))
        next = next > 0 ? ~next : next
        this.trieNodes[node]![seq[i]] = next
      }
      if (next === -1) return -1
      if (next < 0) next = ~next
      node = next
    }
    return node
  }

  refillNext() {
    this.traversalTrie(1, [], (node, _seq) => {
      for (let i = 0; i < this.glen; i++) {
        const next = ~~(this.trieNodes[node]![i] ?? 0)
        if (next !== -1 && next <= node) this.trieNodes[node]![i] = 0
      }
    })
    this.traversalTrie(1, [], (node, seq) => {
      for (let i = 0; i < this.glen; i++) {
        if ((i & 0x1f) === 0) this.trieNodes[node]![this.glen + (i >> 5)] = 0
        const next = ~~(this.trieNodes[node]![i] ?? 0)
        if (next !== -1 && next <= node) this.updateNext(seq.concat(i))
        if (~~(this.trieNodes[node]![i] ?? 0) === -1) {
          this.trieNodes[node]![this.glen + (i >> 5)] =
            (this.trieNodes[node]![this.glen + (i >> 5)] ?? 0) | (1 << (i & 0x1f))
        }
      }
    })
  }

  initTrie(depth: number) {
    this.trieNodes = [null, []]
    this.refillNext()
    const e: number[] = Array.from({ length: this.gens[0].length }, (_, i) => i)
    const visited = new Map<string, number[]>()
    for (let seqlen = 0; seqlen <= depth; seqlen++) {
      this.searchSkip(e, seqlen, [], 1, visited)
      this.refillNext()
    }
  }

  searchSkip(perm: number[], maxl: number, seq: number[], node: number, visited: Map<string, number[]>) {
    if (maxl === 0) {
      const key = String.fromCharCode(...perm)
      if (visited.has(key)) {
        this.addSkipSeq(seq)
      } else {
        visited.set(key, seq.slice())
      }
      return
    }
    for (let i = 0; i < this.glen; i++) {
      const next = this.trieNodes[node]![i] ?? 0
      if (next === -1) continue
      const nn = next < 0 ? ~next : next
      seq.push(i)
      this.searchSkip(permMult(this.gens[i], perm), maxl - 1, seq, nn, visited)
      seq.pop()
    }
  }
}

// ================================================================
// SubgroupSolver
// ================================================================

type PrunTable = [number[], number[], number[], number[], number]

class SubgroupSolver {
  genG: number[][]
  genH: number[][]
  genM: number[][] | null
  sgsH!: SchreierSims
  sgsG!: SchreierSims
  sgsM: SchreierSims | null = null
  sgsMdepth = 0
  isCosetSearch = false
  genEx!: number[][]
  genExi!: number[][]
  genExMap!: [number, number, number][]
  glen!: number
  canon!: CanonSeqGen
  canoni!: CanonSeqGen
  moveTable!: number[]
  idx2coset!: number[][]
  coset2idx!: Record<string | number, number>
  clen = 0
  prunTable!: PrunTable

  constructor(genG: number[][], genH: number[][] | null, genM: number[][] | null) {
    this.genG = genG
    this.genM = genM
    if (!genH) {
      const e = Array.from({ length: genG[0].length }, (_, i) => i)
      this.genH = [e]
    } else {
      this.genH = genH
    }
  }

  private permHash(perm: number[]): string {
    return String.fromCharCode(...perm)
  }

  private midCosetHash(perm: number[]): string | number {
    if (this.sgsM == null) {
      return this.sgsG.isMember(permInv(perm), this.sgsMdepth)
    }
    return this.permHash(this.sgsM.minElem(perm))
  }

  initTables(maxCosetSize = 100000) {
    if (this.coset2idx) return

    this.sgsH = new SchreierSims(this.genH)
    this.sgsG = new SchreierSims(this.sgsH)
    this.sgsG.extend(this.genG)
    const cosetSize = this.sgsG.size() / this.sgsH.size()
    this.isCosetSearch = this.sgsH.size() > 1

    let midCosetSize = 1
    if (this.genM) {
      this.sgsM = new SchreierSims(this.genM)
      midCosetSize = this.sgsG.size() / this.sgsM.size()
    } else if (this.sgsH.size() === 1) {
      this.sgsM = null
      this.sgsMdepth = 0
      for (let i = this.sgsG.e.length - 1; i >= 0; i--) {
        if (midCosetSize * this.sgsG.i2t[i].length > maxCosetSize) break
        this.sgsMdepth = i
        midCosetSize *= this.sgsG.i2t[i].length
      }
    } else if (cosetSize <= maxCosetSize) {
      this.sgsM = new SchreierSims(this.genH)
      midCosetSize = cosetSize
    } else {
      this.sgsM = null
      this.sgsMdepth = this.sgsG.e.length
    }
    this.clen = midCosetSize

    this.genEx = []
    this.genExi = []
    this.genExMap = []
    const genExSet = new Map<string, number>()
    genExSet.set(this.permHash(this.sgsG.e), -1)
    for (let i = 0; i < this.genG.length; i++) {
      let perm = this.genG[i]
      let pow = 1
      while (true) {
        const key = this.permHash(perm)
        if (genExSet.has(key)) break
        genExSet.set(key, this.genEx.length)
        this.genEx.push(perm)
        this.genExi.push(permInv(perm))
        this.genExMap.push([i, pow, 0])
        perm = permMult(this.genG[i], perm)
        pow++
      }
    }
    this.glen = this.genEx.length
    for (let i = 0; i < this.glen; i++) {
      const inv = permInv(this.genEx[i])
      this.genExMap[i][2] = genExSet.get(this.permHash(inv))!
    }

    this.canon = new CanonSeqGen(this.genEx)
    this.canon.initTrie(2)
    this.canoni = new CanonSeqGen(this.genEx)
    for (const seq of this.canon.skipSeqs) {
      const rseq = seq
        .slice()
        .reverse()
        .map(s => this.genExMap[s][2])
      this.canoni.addSkipSeq(rseq)
    }
    this.canoni.refillNext()

    this.moveTable = []
    this.idx2coset = [this.sgsG.e]
    this.coset2idx = {}
    this.coset2idx[this.midCosetHash(this.sgsG.e) as any] = 0

    for (let i = 0; i < this.idx2coset.length; i++) {
      if (i >= midCosetSize) break
      const perm = this.idx2coset[i]
      for (let j = 0; j < this.glen; j++) {
        if (this.genExMap[j][1] !== 1) continue
        const newp = permMult(this.genEx[j], perm)
        const key = this.midCosetHash(newp)
        if (!((key as any) in this.coset2idx)) {
          this.coset2idx[key as any] = this.idx2coset.length
          this.idx2coset.push(newp)
        }
        this.moveTable[i * this.glen + j] = this.coset2idx[key as any]
      }
    }

    let stdMove: number | null = null
    for (let j = 0; j < this.glen; j++) {
      if (this.genExMap[j][1] === 1) {
        stdMove = j
        continue
      }
      for (let i = 0; i < this.clen; i++) {
        this.moveTable[i * this.glen + j] = this.moveTable[this.moveTable[i * this.glen + j - 1] * this.glen + stdMove!]
      }
    }
    this.prunTable = this.initPrunTable(this.sgsG.e)
  }

  initPrunTable(perm: number[], tryNISS = false): PrunTable {
    const pidx = this.coset2idx[this.midCosetHash(perm) as any]
    const prunArr: number[] = []
    const fartherMask: number[] = []
    const nocloserMask: number[] = []
    const maskBase = (this.glen + 31) >> 5
    const permMove: number[] = []

    for (let i = 0; i < this.clen; i++) prunArr[i] = -1

    if (tryNISS) {
      for (let i = 0; i < this.clen; i++) {
        prunArr.push(-1, -1)
        permMove[i] = this.coset2idx[this.midCosetHash(permMult(perm, this.idx2coset[i])) as any]
        permMove[permMove[i] + this.clen] = i
      }
      prunArr[0] = 0
    } else {
      prunArr[pidx] = 0
    }

    let fill = 1
    let lastfill = 0
    let curDepth = 0
    while (fill !== lastfill) {
      lastfill = fill
      for (let idx = 0; idx < prunArr.length; idx++) {
        if (prunArr[idx] !== curDepth) continue
        const cidx = idx % this.clen
        const midx = idx - cidx
        for (let m = 0; m < this.glen; m++) {
          const newIdx = this.moveTable[cidx * this.glen + m] + midx
          const newPrun = prunArr[newIdx]
          if (prunArr[newIdx] === -1) {
            prunArr[newIdx] = curDepth + 1
            fill++
          }
          if ((newPrun === -1 ? curDepth + 1 : newPrun) > curDepth) {
            fartherMask[idx * maskBase + (m >> 5)] = (fartherMask[idx * maskBase + (m >> 5)] ?? 0) | (1 << (m & 0x1f))
          }
          if ((newPrun === -1 ? curDepth + 1 : newPrun) >= curDepth) {
            nocloserMask[idx * maskBase + (m >> 5)] = (nocloserMask[idx * maskBase + (m >> 5)] ?? 0) | (1 << (m & 0x1f))
          }
        }
        if (!tryNISS || midx !== 0) continue
        for (let m = 0; m < 2; m++) {
          const newIdx = permMove[cidx + (1 - m) * this.clen] + (m + 1) * this.clen
          if (prunArr[newIdx] === -1) {
            prunArr[newIdx] = curDepth
            fill++
          }
        }
      }
      curDepth++
    }
    return [prunArr, fartherMask, nocloserMask, permMove, curDepth]
  }

  private idaMidSearch(
    pidx: number,
    maxl: number,
    lm: number,
    trieNodes: (number[] | null)[],
    moves: number[],
    curPerm: number[],
    insertPerm: number[] | null,
    prunTable: PrunTable,
    callback: (moves: number[], permKey: number[]) => any,
  ): any {
    const nodePrun = prunTable[0][pidx]
    if (nodePrun > maxl) return false
    if (maxl === 0) {
      if (pidx >= this.clen) {
        moves.push(-1)
        const newPerm = permMult(curPerm, insertPerm!)
        const ret = callback(moves, newPerm)
        moves.pop()
        return ret
      }
      return callback(moves, curPerm)
    }

    if (pidx >= this.clen && lm !== 0) {
      const newpidx = prunTable[3][pidx - this.clen]
      moves.push(-1)
      const newPerm = permMult(curPerm, insertPerm!)
      const ret = this.idaMidSearch(newpidx, maxl, 1, trieNodes, moves, newPerm, insertPerm, prunTable, callback)
      moves.pop()
      if (ret) return ret
    }

    const node = trieNodes[lm || 1]!
    const glenBase = pidx * ((this.glen + 31) >> 5)

    for (let mbase = 0; mbase < this.glen; mbase += 32) {
      let mask = node[this.glen + (mbase >> 5)] ?? 0
      mask |= nodePrun >= maxl - 1 ? (prunTable[nodePrun - maxl + 2]?.[glenBase + (mbase >> 5)] ?? 0) : 0
      mask = ~mask & (this.glen - mbase >= 32 ? -1 : (1 << (this.glen - mbase)) - 1)
      while (mask !== 0) {
        const midx = 31 - Math.clz32(mask)
        mask -= 1 << midx
        const mi = midx + mbase
        const cidx = pidx % this.clen
        const newpidx = this.moveTable[cidx * this.glen + mi] + pidx - cidx
        const nextCanon = node[mi] ?? 0
        moves.push(mi)
        const newPerm = permMult(curPerm, this.genExi[mi])
        const ret = this.idaMidSearch(
          newpidx,
          maxl - 1,
          nextCanon ^ (nextCanon >> 31),
          trieNodes,
          moves,
          newPerm,
          insertPerm,
          prunTable,
          callback,
        )
        moves.pop()
        if (ret) return ret
      }
    }
    return false
  }

  checkPerm(perm: number[]): number {
    this.initTables()
    if (this.sgsH.isMember(perm) >= 0) return 1
    if (this.sgsG.isMember(perm) < 0) return 2
    return 0
  }

  static ALLOW_PRE = 0x2

  solve(
    perm: number[],
    minl: number,
    maxl: number,
    solCallback?: (solution: ([number, number] | null)[]) => any,
    permCtx?: { mask: number; prunTable?: PrunTable },
  ): ([number, number] | null)[] | undefined {
    this.initTables()
    if (this.sgsG.isMember(perm) < 0) return undefined
    let pidx = this.coset2idx[this.midCosetHash(perm) as any]
    if (pidx === undefined) return undefined

    const tryNISS = !!(permCtx && permCtx.mask & SubgroupSolver.ALLOW_PRE) && this.isCosetSearch
    let prunTable1 = this.prunTable
    let prunTable2: PrunTable | null = null
    let ret: any = null

    if (tryNISS) {
      permCtx!.prunTable = permCtx!.prunTable || this.initPrunTable(perm, true)
      prunTable2 = permCtx!.prunTable!
      prunTable1 = prunTable2
      pidx = this.clen
    }

    const mapSol = (moves: number[]): ([number, number] | null)[] => {
      const solution: ([number, number] | null)[] = []
      for (const m of moves) {
        if (m === -1) solution.push(null)
        else solution.push([this.genExMap[m][0], this.genExMap[m][1]])
      }
      return solution
    }

    for (let depth = Math.max(minl, prunTable1[0][pidx]); depth <= maxl; depth++) {
      const permi = permInv(perm)

      if (depth <= this.prunTable[4]) {
        ret = this.idaMidSearch(
          tryNISS ? this.clen : pidx,
          depth,
          1,
          this.canon.trieNodes,
          [],
          this.sgsG.toKeyIdx(tryNISS ? null : permi),
          permi,
          prunTable1,
          (moves, permKey) => {
            if (this.sgsG.isSubgroupMemberByKey(permKey, this.sgsH) < 0) return
            return solCallback ? solCallback(mapSol(moves)) : mapSol(moves)
          },
        )
        if (ret) return ret
        continue
      }

      const mid = ~~(depth / 2)
      if (!prunTable2) prunTable2 = this.initPrunTable(perm, tryNISS)
      const preSize = tryNISS ? 2 : 1

      for (let mpidx = 0; mpidx < this.clen * preSize; mpidx++) {
        const mpidx1 = mpidx
        const mpidx2 = mpidx + (tryNISS ? (mpidx >= this.clen ? -this.clen : this.clen * 2) : 0)
        if (prunTable1[0][mpidx1] > mid || prunTable2[0][mpidx2] > depth - mid) continue

        const visited = new Map<string, number[][]>()
        const perm0 = this.isCosetSearch ? this.sgsG.e : this.sgsG.toKeyIdx()

        this.idaMidSearch(mpidx1, mid, 0, this.canon.trieNodes, [], perm0, permi, prunTable1, (moves, permKey) => {
          const key = this.isCosetSearch ? this.permHash(this.sgsH.minElem(permKey)) : this.permHash(permKey)
          const sols = visited.get(key) || []
          sols.push(moves.slice())
          visited.set(key, sols)
        })

        ret = this.idaMidSearch(
          mpidx2,
          depth - mid,
          1,
          this.canoni.trieNodes,
          [],
          perm0,
          perm,
          prunTable2,
          (moves, permKey) => {
            const finalPK = tryNISS ? permKey : permMult(permKey, perm)
            const key = this.isCosetSearch ? this.permHash(this.sgsH.minElem(finalPK)) : this.permHash(finalPK)

            if (visited.has(key)) {
              const sols2h: ([number, number] | null)[] = []
              let node = 1
              for (let i = 0; i < moves.length; i++) {
                let move = moves[moves.length - 1 - i]
                move = move === -1 ? -1 : this.genExMap[move][2]
                node = move === -1 ? 1 : (this.canon.trieNodes[node]![move] ?? 0)
                if (node === -1) return
                node ^= node >> 31
                if (move === -1) sols2h.push(null)
                else sols2h.push([this.genExMap[move][0], this.genExMap[move][1]])
              }

              for (const sol1 of visited.get(key)!) {
                const solution = sols2h.slice()
                let node2 = node
                let valid = true
                for (const move of sol1) {
                  if (move === -1) {
                    node2 = 1
                    solution.push(null)
                    continue
                  }
                  node2 = this.canon.trieNodes[node2]![move] ?? 0
                  if (node2 === -1) {
                    valid = false
                    break
                  }
                  node2 ^= node2 >> 31
                  solution.push([this.genExMap[move][0], this.genExMap[move][1]])
                }
                if (!valid) continue
                const chk = solCallback ? solCallback(solution) : solution
                if (chk) return chk
              }
            }
          },
        )
        if (ret) break
      }
      if (ret) break
    }
    return ret
  }
}

// ================================================================
// Step definitions and solver initialization
// ================================================================

const STEP_MOVE_DEFS = [
  ['U ', 'R ', 'F ', 'D ', 'L ', 'B '],
  ['U ', 'R ', 'F2', 'D ', 'L ', 'B2'],
  ['U ', 'R2', 'F2', 'D ', 'L2', 'B2'],
  ['U2', 'R2', 'F2', 'D2', 'L2', 'B2'],
]

const MIDDLE_GROUPS: (string[] | null)[] = [
  null,
  ['U', 'R2', 'F2', 'D', 'L2', 'B2', "R U R U R U' R' U' R' U'"],
  ['U2', 'R2', 'F2', 'D2', 'L2', 'B2', 'U D'],
  null,
]

const CONJ_MOVES = ['URFDLB', 'RFULBD', 'FURBDL', 'RDFLUB', 'FRDBLU', 'DFRUBL']

// prettier-ignore
const AXIS_SWITCH_ORI: (number | number[])[][] = [[8, [8, 8]], [8, [8, 8], 23, [8, 8, 23], [8, 23]], [8, [8, 8]], []]

// prettier-ignore
const AXIS_PREFIX = [['fb', 'ud', 'rl'], ['ud', 'rl', 'fb', 'rl', 'fb', 'ud'], ['ud', 'fb', 'rl'], ['']]

function movesToGen(moves: string[]): number[][] {
  return moves.map(m => parseScramble(m))
}

let solvers: SubgroupSolver[] | null = null
let gens: number[][][] | null = null
let axisSwitchPerms: number[][][] | null = null

function initSolvers() {
  if (solvers) return
  gens = STEP_MOVE_DEFS.map(movesToGen)
  solvers = []
  for (let i = 0; i < 4; i++) {
    const midGen = MIDDLE_GROUPS[i] ? movesToGen(MIDDLE_GROUPS[i]!) : null
    const genH = i + 1 < gens!.length ? gens![i + 1] : null
    solvers[i] = new SubgroupSolver(gens![i], genH, midGen)
    solvers[i].initTables()
  }

  axisSwitchPerms = []
  for (let step = 0; step < 4; step++) {
    axisSwitchPerms[step] = []
    for (const oriSpec of AXIS_SWITCH_ORI[step]) {
      if (Array.isArray(oriSpec)) {
        let p = rotations.rotPerm(oriSpec[0])
        for (let k = 1; k < oriSpec.length; k++) {
          p = permMult(p, rotations.rotPerm(oriSpec[k]))
        }
        axisSwitchPerms[step].push(p)
      } else {
        axisSwitchPerms[step].push(rotations.rotPerm(oriSpec as number))
      }
    }
  }
}

// ================================================================
// Solution formatting
// ================================================================

function formatSolution(
  rawSol: ([number, number] | null)[],
  stepMoves: string[],
  conjMoves: string,
  useNiss: boolean,
): string[] {
  if (useNiss && !rawSol.some(m => m === null)) {
    rawSol = [null, ...rawSol]
  }
  const result: string[] = []
  for (const item of rawSol) {
    if (item === null) {
      result.push('@')
      continue
    }
    const [axis, pow] = item
    const basePow = "0 2'".indexOf(stepMoves[axis][1])
    const actualPow = (basePow * pow) % 4
    if (actualPow === 0) continue
    const face = conjMoves.charAt(axis)
    const suffix = ['', '', '2', "'"][actualPow]
    result.push(face + suffix)
  }
  return result
}

/**
 * For each step, faces where the step allows quarter turns but the subgroup
 * only allows half turns. X and X' are equivalent as the last move because
 * X² ∈ H, so `state * X ∈ H ⟹ state * X' = state * X * X² ∈ H`.
 */
function getEquivFaces(step: number, conjIdx: number): Set<string> {
  if (step >= STEP_MOVE_DEFS.length - 1) return new Set()
  const faces = new Set<string>()
  const conjM = CONJ_MOVES[conjIdx]
  for (let i = 0; i < 6; i++) {
    if (STEP_MOVE_DEFS[step][i][1] === ' ' && STEP_MOVE_DEFS[step + 1][i][1] === '2') {
      faces.add(conjM[i])
    }
  }
  return faces
}

/**
 * Normalize equivalent last moves (X' → X) for deduplication.
 * - Last normal move (after @ or whole solution): can always be swapped.
 * - First pre-move (before @): equivalent via the inverse argument
 *   (it's the "last move" of the inverse algorithm, and X² ∈ H).
 */
function normalizeSolution(sol: string, equivFaces: Set<string>): string {
  if (equivFaces.size === 0) return sol
  const tokens = sol.split(' ')
  const atIdx = tokens.indexOf('@')
  const normalStart = atIdx >= 0 ? atIdx + 1 : 0
  for (let i = tokens.length - 1; i >= normalStart; i--) {
    if (tokens[i].endsWith("'") && equivFaces.has(tokens[i][0])) {
      tokens[i] = tokens[i][0]
    }
    break
  }
  if (atIdx > 0 && tokens[0].endsWith("'") && equivFaces.has(tokens[0][0])) {
    tokens[0] = tokens[0][0]
  }
  return tokens.join(' ')
}

// ================================================================
// Public API
// ================================================================

export interface SolveOptions {
  /** Last move of the previous step, for cancellation calculation (e.g. "R'", "U2"). */
  lastMove?: string
  /** Enable NISS. Solutions may contain '@' separator for pre-moves. */
  useNiss?: boolean
  /** Stop early after finding this many solutions per axis. */
  maxSolutions?: number
  /** Return non-optimal solutions up to this many moves deeper than optimal. */
  includeSuboptimal?: number
}

export function solveStep(step: number, scramble: string, options: SolveOptions = {}): StepSolutions[] {
  const { lastMove, useNiss = false, maxSolutions, includeSuboptimal } = options
  initSolvers()
  const state = parseScramble(scramble)
  const lastMoveInfo = lastMove ? parseMoveStr(lastMove) : null
  const cancelExtra = lastMoveInfo ? 2 : 0
  const maxExtraDepth = Math.max(cancelExtra, includeSuboptimal || 0)
  const nissMask = useNiss ? SubgroupSolver.ALLOW_PRE : 0

  const results: StepSolutions[] = []

  const transforms: { perm: number[] | null; axis: string; conjIdx: number }[] = [
    { perm: null, axis: AXIS_PREFIX[step][0], conjIdx: 0 },
  ]
  for (let i = 0; i < axisSwitchPerms![step].length; i++) {
    transforms.push({
      perm: axisSwitchPerms![step][i],
      axis: AXIS_PREFIX[step][i + 1] || '',
      conjIdx: i + 1,
    })
  }

  for (const { perm: trans, axis, conjIdx } of transforms) {
    let rotState: number[]
    if (trans) {
      const transi = permInv(trans)
      rotState = permMult(trans, permMult(state, transi))
    } else {
      rotState = state
    }

    const check = solvers![step].checkPerm(rotState)
    if (check === 2) continue
    if (check === 1) {
      results.push({ axis, solutions: [], effectiveLength: 0 })
      continue
    }

    const conjM = CONJ_MOVES[conjIdx]
    const stepMoves = STEP_MOVE_DEFS[step]
    const allSols: { moves: string[]; effective: number }[] = []
    let minRawDepth = -1
    let done = false

    for (let depth = 0; depth <= 20 && !done; depth++) {
      const ctx = { mask: nissMask }
      solvers![step].solve(
        rotState,
        depth,
        depth,
        sol => {
          const moves = formatSolution(sol, stepMoves, conjM, useNiss)
          const moveCount = moves.filter(m => m !== '@').length
          const cancel = calculateCancellation(lastMoveInfo, moves)
          allSols.push({ moves, effective: moveCount - cancel })
          if (maxSolutions && allSols.length >= maxSolutions) return true as any
          return undefined
        },
        ctx,
      )
      if (allSols.length > 0 && minRawDepth < 0) minRawDepth = depth
      if (maxSolutions && allSols.length >= maxSolutions) {
        done = true
        break
      }
      if (minRawDepth >= 0 && depth >= minRawDepth + maxExtraDepth) break
    }

    if (allSols.length > 0) {
      let minEff = Infinity
      for (const s of allSols) if (s.effective < minEff) minEff = s.effective
      const equivFaces = getEquivFaces(step, conjIdx)

      if (includeSuboptimal) {
        const byEff = new Map<number, Set<string>>()
        for (const s of allSols) {
          if (s.effective > minEff + includeSuboptimal) continue
          if (!byEff.has(s.effective)) byEff.set(s.effective, new Set())
          byEff.get(s.effective)!.add(normalizeSolution(s.moves.join(' '), equivFaces))
        }
        for (const [eff, set] of byEff) {
          const sols = [...set]
          if (maxSolutions && sols.length > maxSolutions) sols.length = maxSolutions
          results.push({ axis, solutions: sols, effectiveLength: eff })
        }
      } else {
        const uniqueSet = new Set<string>()
        for (const s of allSols) {
          if (s.effective === minEff) uniqueSet.add(normalizeSolution(s.moves.join(' '), equivFaces))
        }
        const sols = [...uniqueSet]
        if (maxSolutions && sols.length > maxSolutions) sols.length = maxSolutions
        results.push({ axis, solutions: sols, effectiveLength: minEff })
      }
    }
  }

  return results
}

/**
 * Find all optimal EO (Edge Orientation) solutions for a scramble.
 * @param scramble - The cube scramble string (e.g. "R' U' F L2 D2 ... R' U' F").
 * @param options - Optional: `useNiss`, `maxSolutions`.
 * @returns Results grouped by axis (fb, ud, rl).
 */
export function solveEO(scramble: string, options?: SolveOptions): StepSolutions[] {
  return solveStep(0, scramble, options)
}

/**
 * Find all optimal DR (Domino Reduction) solutions for an EO-solved state.
 * @param scramble - Full state: original scramble + EO solution appended.
 * @param options - Optional: `lastMove` (for cancellation), `useNiss`, `maxSolutions`.
 * @returns Results grouped by axis.
 */
export function solveDR(scramble: string, options?: SolveOptions): StepSolutions[] {
  return solveStep(1, scramble, options)
}

/**
 * Find all optimal HTR (Half-Turn Reduction) solutions for a DR-solved state.
 * @param scramble - Full state: original scramble + EO sol + DR sol appended.
 *   For NISS DR solutions, use `drSol.replace('@', drScramble)` to build this.
 * @param options - Optional: `lastMove` (for cancellation), `useNiss`, `maxSolutions`.
 * @returns Results grouped by axis.
 */
export function solveHTR(scramble: string, options?: SolveOptions): StepSolutions[] {
  return solveStep(2, scramble, options)
}

/**
 * Check whether a scramble string results in an HTR state (solvable with half-turns only).
 */
export function isHTRState(scramble: string): boolean {
  initSolvers()
  const state = parseScramble(scramble)
  return solvers![2].checkPerm(state) === 1
}

// ================================================================
// Leave-slice detection and solver
// ================================================================

export type DRAxis = 'ud' | 'fb' | 'rl'

const EDGE_PIECE_LOOKUP = new Map<number, number>()
for (let e = 0; e < 12; e++) {
  EDGE_PIECE_LOOKUP.set(eFacelet[e][0], e)
  EDGE_PIECE_LOOKUP.set(eFacelet[e][1], e)
}

const CORNER_PIECE_LOOKUP = new Map<number, number>()
for (let c = 0; c < 8; c++) {
  CORNER_PIECE_LOOKUP.set(cFacelet[c][0], c)
  CORNER_PIECE_LOOKUP.set(cFacelet[c][1], c)
  CORNER_PIECE_LOOKUP.set(cFacelet[c][2], c)
}

// prettier-ignore
const LS_AXIS_CONFIG: Record<DRAxis, {
  moveIdx: number[]; moveNames: string[]; moveFaces: number[]
  solvedFaces: number[]; variableSlice: number[]; solvedEdges: number[]
}> = {
  ud: {
    moveIdx:   [0,1,2, 4, 7, 9,10,11, 13, 16],
    moveNames: ['U','U2',"U'",'R2','F2','D','D2',"D'",'L2','B2'],
    moveFaces: [0,0,0, 1, 2, 3,3,3,    4,  5],
    solvedFaces: [0, 3],
    variableSlice: [8, 9, 10, 11],
    solvedEdges: [0, 1, 2, 3, 4, 5, 6, 7],
  },
  fb: {
    moveIdx:   [1, 4, 6,7,8, 10, 13, 15,16,17],
    moveNames: ['U2','R2','F','F2',"F'",'D2','L2','B','B2',"B'"],
    moveFaces: [0,   1,   2,2,2,   3,   4,   5,5,5],
    solvedFaces: [2, 5],
    variableSlice: [0, 2, 4, 6],
    solvedEdges: [1, 3, 5, 7, 8, 9, 10, 11],
  },
  rl: {
    moveIdx:   [1, 3,4,5, 7, 10, 12,13,14, 16],
    moveNames: ['U2','R','R2',"R'",'F2','D2','L','L2',"L'",'B2'],
    moveFaces: [0,   1,1,1,   2,   3,   4,4,4,    5],
    solvedFaces: [1, 4],
    variableSlice: [1, 3, 5, 7],
    solvedEdges: [0, 2, 4, 6, 8, 9, 10, 11],
  },
}

// --- Rotation-aware goal detection ---

// prettier-ignore
// Corner permutations for the 4 cube rotations (e, x2, y2, z2)
const CORNER_ROT_PERMS = [
  [0,1,2,3,4,5,6,7],  // e
  [7,6,5,4,3,2,1,0],  // x2: (0,7)(1,6)(2,5)(3,4)  U↔D F↔B
  [2,3,0,1,6,7,4,5],  // y2: (0,2)(1,3)(4,6)(5,7)  F↔B R↔L
  [5,4,7,6,1,0,3,2],  // z2: (0,5)(1,4)(2,7)(3,6)  U↔D R↔L
]
// prettier-ignore
// Edge permutations for the 4 rotations
const EDGE_ROT_PERMS = [
  [0,1,2,3, 4,5,6,7, 8,9,10,11],   // e
  [4,7,6,5, 0,3,2,1, 11,10,9,8],   // x2
  [2,3,0,1, 6,7,4,5, 10,11,8,9],   // y2
  [6,5,4,7, 2,1,0,3, 9,8,11,10],   // z2
]
// Face color expected per rotation: FACE_COLOR_MAP[rotIdx][faceIdx] = expected color
// prettier-ignore
const FACE_COLOR_MAP = [
  [0, 1, 2, 3, 4, 5],  // e
  [3, 1, 5, 0, 4, 2],  // x2: U↔D F↔B
  [0, 4, 5, 3, 1, 2],  // y2: F↔B R↔L
  [3, 4, 2, 0, 1, 5],  // z2: U↔D R↔L
]
// rotKey (udSwap<<2 | fbSwap<<1 | rlSwap) → rotation index; -1 = invalid
const ROT_KEY_TO_IDX = [0, -1, -1, 2, -1, 3, 1, -1]
// Valid rotation indices per DR axis (only rotations that don't swap the DR axis)
const VALID_ROTS: Record<DRAxis, number[]> = { ud: [0, 2], fb: [0, 3], rl: [0, 1] }

// All facelets belonging to the two DR-axis layers (corners + solved edges)
const LS_LAYER_FACELETS: Record<DRAxis, number[]> = { ud: [], fb: [], rl: [] }
for (const axis of ['ud', 'fb', 'rl'] as DRAxis[]) {
  const fl: number[] = []
  for (let c = 0; c < 8; c++) for (let n = 0; n < 3; n++) fl.push(cFacelet[c][n])
  for (const e of LS_AXIS_CONFIG[axis].solvedEdges) for (let n = 0; n < 2; n++) fl.push(eFacelet[e][n])
  LS_LAYER_FACELETS[axis] = fl
}

// --- Pruning tables (Lehmer-coded 8-perm, multi-source BFS) ---

const FACT8 = [5040, 720, 120, 24, 6, 2, 1]

function encode8(p: number[]): number {
  let c = 0
  for (let i = 0; i < 7; i++) {
    let d = 0
    for (let j = i + 1; j < 8; j++) if (p[j] < p[i]) d++
    c += d * FACT8[i]
  }
  return c
}

function apply8(s: number[], m: number[]): number[] {
  return [s[m[0]], s[m[1]], s[m[2]], s[m[3]], s[m[4]], s[m[5]], s[m[6]], s[m[7]]]
}

function buildPrun8(moves: number[][], seeds: number[][]): Uint8Array {
  const t = new Uint8Array(40320).fill(255)
  let front: number[][] = []
  for (const s of seeds) {
    const code = encode8(s)
    if (t[code] === 255) {
      t[code] = 0
      front.push(s)
    }
  }
  let d = 0
  while (front.length > 0) {
    const next: number[][] = []
    for (const p of front) {
      for (const mp of moves) {
        const np = apply8(p, mp)
        const code = encode8(np)
        if (t[code] === 255) {
          t[code] = d + 1
          next.push(np)
        }
      }
    }
    front = next
    d++
  }
  return t
}

interface LSPrunData {
  cPrun: Uint8Array
  ePrun: Uint8Array
  cMoves: number[][]
  eMoves: number[][]
}

const lsPrunCache: Partial<Record<DRAxis, LSPrunData>> = {}

function initLSPrun(drAxis: DRAxis): LSPrunData {
  if (lsPrunCache[drAxis]) return lsPrunCache[drAxis]!
  const cfg = LS_AXIS_CONFIG[drAxis]
  const se = cfg.solvedEdges
  const eMap = new Map<number, number>()
  se.forEach((e, i) => eMap.set(e, i))

  const cMoves: number[][] = []
  const eMoves: number[][] = []
  for (const mi of cfg.moveIdx) {
    const m = MOVE_PERMS[mi]
    const cm = new Array(8)
    for (let c = 0; c < 8; c++) cm[c] = CORNER_PIECE_LOOKUP.get(m[cFacelet[c][0]])!
    cMoves.push(cm)
    const em = new Array(8)
    for (let i = 0; i < 8; i++) em[i] = eMap.get(EDGE_PIECE_LOOKUP.get(m[eFacelet[se[i]][0]])!)!
    eMoves.push(em)
  }

  const rotIdxs = VALID_ROTS[drAxis]
  const cSeeds = rotIdxs.map(ri => CORNER_ROT_PERMS[ri])
  const eSeeds = rotIdxs.map(ri => {
    const full = EDGE_ROT_PERMS[ri]
    return se.map(e => eMap.get(full[e])!)
  })

  const data: LSPrunData = {
    cPrun: buildPrun8(cMoves, cSeeds),
    ePrun: buildPrun8(eMoves, eSeeds),
    cMoves,
    eMoves,
  }
  lsPrunCache[drAxis] = data
  return data
}

/**
 * Check whether a facelet permutation is a valid leave-slice state for the given DR axis.
 * Both DR-axis LAYERS must be solved (all corner/edge facelets show correct color),
 * accepting rotation-equivalent states (e/x2/y2/z2). Equatorial-slice edges
 * checked relative to the detected rotation: solved, 3-cycle, or 2-2 swap.
 */
export function isLeaveSliceState(perm: number[], drAxis: DRAxis): boolean {
  const udSwap = ((perm[0] / 9) | 0) === 3 ? 1 : 0
  const fbSwap = ((perm[18] / 9) | 0) === 5 ? 1 : 0
  const rlSwap = ((perm[9] / 9) | 0) === 4 ? 1 : 0
  const rotIdx = ROT_KEY_TO_IDX[(udSwap << 2) | (fbSwap << 1) | rlSwap]
  if (rotIdx < 0) return false
  const colorMap = FACE_COLOR_MAP[rotIdx]
  for (const p of LS_LAYER_FACELETS[drAxis]) {
    if (((perm[p] / 9) | 0) !== colorMap[(p / 9) | 0]) return false
  }
  const edgeExpect = EDGE_ROT_PERMS[rotIdx]
  let displaced = 0
  for (const e of LS_AXIS_CONFIG[drAxis].variableSlice) {
    if (EDGE_PIECE_LOOKUP.get(perm[eFacelet[e][0]]) !== edgeExpect[e]) displaced++
  }
  return displaced === 0 || displaced === 3 || displaced === 4
}

/**
 * Find all optimal leave-slice solutions for an HTR-solved state.
 * Uses IDA* with DR-level moves (QT on DR-axis faces + HT on others)
 * and corner/edge pruning tables to reach a state where the two DR-axis
 * faces are fully solved and the equatorial-slice edges are solved / 3-cycle / 2-2.
 * @param scramble - Full state after EO + DR + HTR.
 * @param drAxis - The DR axis ('ud', 'fb', or 'rl').
 * @param options - Optional: `lastMove` (for cancellation), `maxSolutions`.
 */
export function solveLeaveSlice(scramble: string, drAxis: DRAxis, options?: SolveOptions): StepSolutions[] {
  const { lastMove, maxSolutions, includeSuboptimal } = options || {}
  const state = parseScramble(scramble)
  const lastMoveInfo = lastMove ? parseMoveStr(lastMove) : null
  const cancelExtra = lastMoveInfo ? 2 : 0
  const maxExtraDepth = Math.max(cancelExtra, includeSuboptimal || 0)
  const cfg = LS_AXIS_CONFIG[drAxis]
  const prun = initLSPrun(drAxis)
  const movePerms = cfg.moveIdx.map(i => MOVE_PERMS[i])
  const mLen = movePerms.length

  const se = cfg.solvedEdges
  const eMap = new Map<number, number>()
  se.forEach((e, i) => eMap.set(e, i))

  const initCp: number[] = new Array(8)
  for (let c = 0; c < 8; c++) initCp[c] = CORNER_PIECE_LOOKUP.get(state[cFacelet[c][0]])!
  const initEp: number[] = new Array(8)
  for (let i = 0; i < 8; i++) initEp[i] = eMap.get(EDGE_PIECE_LOOKUP.get(state[eFacelet[se[i]][0]])!)!

  const drFace0 = cfg.solvedFaces[0]
  const drFace1 = cfg.solvedFaces[1]
  function canPrune(face: number, lastFace: number): boolean {
    if (face === lastFace) return true
    if (lastFace < 0 || (face + 3) % 6 !== lastFace) return false
    // DR-axis pair: block both directions (no slice moves)
    if ((face === drFace0 && lastFace === drFace1) || (face === drFace1 && lastFace === drFace0)) return true
    // Other opposite pairs: canonical order (lower index first)
    return lastFace > face
  }

  const allSols: { sol: string[]; effective: number }[] = []
  let minRawDepth = -1

  function dfs(perm: number[], cp: number[], ep: number[], depth: number, lastFace: number, moves: string[]) {
    if (prun.cPrun[encode8(cp)] > depth || prun.ePrun[encode8(ep)] > depth) return
    if (depth === 0) {
      if (isLeaveSliceState(perm, drAxis)) {
        const cancel = calculateCancellation(lastMoveInfo, moves)
        allSols.push({ sol: moves.slice(), effective: moves.length - cancel })
      }
      return
    }
    for (let m = 0; m < mLen; m++) {
      if (canPrune(cfg.moveFaces[m], lastFace)) continue
      moves.push(cfg.moveNames[m])
      dfs(
        permMult(movePerms[m], perm),
        apply8(cp, prun.cMoves[m]),
        apply8(ep, prun.eMoves[m]),
        depth - 1,
        cfg.moveFaces[m],
        moves,
      )
      moves.pop()
    }
  }

  for (let depth = 0; depth <= 15; depth++) {
    dfs(state, initCp, initEp, depth, -1, [])
    if (allSols.length > 0 && minRawDepth < 0) minRawDepth = depth
    if (maxSolutions && allSols.length >= maxSolutions) break
    if (minRawDepth >= 0 && depth >= minRawDepth + maxExtraDepth) break
  }

  if (allSols.length === 0) return []

  let minEff = Infinity
  for (const s of allSols) if (s.effective < minEff) minEff = s.effective

  if (includeSuboptimal) {
    const byEff = new Map<number, Set<string>>()
    for (const s of allSols) {
      if (s.effective > minEff + includeSuboptimal) continue
      if (!byEff.has(s.effective)) byEff.set(s.effective, new Set())
      byEff.get(s.effective)!.add(s.sol.join(' '))
    }
    const results: StepSolutions[] = []
    for (const [eff, set] of byEff) {
      const sols = [...set]
      if (maxSolutions && sols.length > maxSolutions) sols.length = maxSolutions
      results.push({ axis: '', solutions: sols, effectiveLength: eff })
    }
    return results
  }

  const uniqueSet = new Set<string>()
  for (const s of allSols) {
    if (s.effective === minEff) uniqueSet.add(s.sol.join(' '))
  }

  const sols = [...uniqueSet]
  if (maxSolutions && sols.length > maxSolutions) sols.length = maxSolutions

  return [{ axis: '', solutions: sols, effectiveLength: minEff }]
}

// ================================================================
// DR Quarter-Turn classification
// ================================================================

// Corner facelet positions (InsertionFinder UDRLF B convention).
// Each triple is ordered [UD-axis, LR-axis, FB-axis].
const QT_CORNER_FACELETS = [
  [0, 27, 47], // ULB
  [2, 20, 45], // URB
  [6, 29, 36], // ULF
  [8, 18, 38], // URF
  [9, 35, 42], // DLF
  [11, 24, 44], // DRF
  [15, 33, 53], // DLB
  [17, 26, 51], // DRB
]

const QT_FACE_AXIS: Record<string, number> = { U: 0, D: 0, R: 1, L: 1, F: 2, B: 2 }

// Geometric line axis connecting each pair of diagonally-opposite corners.
const QT_CORNER_LINES: Record<number, Record<number, string>> = {
  0: { 1: 'x', 2: 'z', 6: 'y' },
  1: { 0: 'x', 3: 'z', 7: 'y' },
  2: { 0: 'z', 3: 'x', 4: 'y' },
  3: { 1: 'z', 2: 'x', 5: 'y' },
  4: { 2: 'y', 5: 'x', 6: 'z' },
  5: { 3: 'y', 4: 'x', 7: 'z' },
  6: { 0: 'y', 4: 'z', 7: 'x' },
  7: { 1: 'y', 5: 'z', 6: 'x' },
}

/**
 * Compute the QT (Quarter-Turn) classification number for a DR state.
 *
 * The QT number indicates the minimum number of quarter turns (within DR moves)
 * needed to bring the corners to HTR. Values range 0–5.
 *
 * @param algorithm - Move sequence applied to a solved cube (e.g. scramble + solution).
 * @returns The QT number (0–5), or `null` if the state is not DR.
 */
export function getDRQT(algorithm: string): number | null {
  const cube = new Cube()
  try {
    cube.twist(new Algorithm(algorithm))
  } catch {
    return null
  }

  if (cube.isSolved() || cube.isHalfTurnReductionSolved()) return 0

  const drStatus: string[] = cube.getDominoReductionStatus()
  if (drStatus.length === 0) return null

  const parity = cube.hasParity()
  const f = cube.toFaceletString()

  let corners = 0
  const bad: number[] = []
  const good: number[] = []
  for (let i = 0; i < 8; i++) {
    if (QT_CORNER_FACELETS[i].some((fi, ax) => QT_FACE_AXIS[f[fi]] !== ax)) {
      corners++
      bad.push(i)
    } else {
      good.push(i)
    }
  }

  switch (corners) {
    case 0:
    case 8: {
      if (parity) return 3
      const uOdd = [0, 2, 6, 8].filter(i => f[i] === f[0]).length % 2 === 1
      const rlOdd = [18, 20, 27, 29].filter(i => f[i] === f[18]).length % 2 === 1
      return uOdd || rlOdd ? 4 : 0
    }
    case 2:
    case 6: {
      if (!parity) return 4
      const cf: Record<string, number> = {}
      for (let i = 0; i < 4; i++) {
        let j = i
        const targets = corners === 6 ? good : bad
        if (targets.includes(i)) j = targets.find(c => c !== i)!
        for (const fi of QT_CORNER_FACELETS[j]) {
          cf[f[fi]] = (cf[f[fi]] || 0) + 1
        }
      }
      return Object.values(cf).some(c => c % 2 === 1) ? 3 : 5
    }
    case 4: {
      let normal = 2
      let inverse = 1
      const cf: Record<string, number> = {}
      for (const bc of bad) {
        for (const fi of QT_CORNER_FACELETS[bc]) {
          cf[f[fi]] = (cf[f[fi]] || 0) + 1
        }
      }
      const first = bad[0]
      const second = bad.slice(1).find(c => QT_CORNER_LINES[first]?.[c] !== undefined)!
      const rest = bad.filter(c => c !== first && c !== second)
      if (QT_CORNER_LINES[first][second] === QT_CORNER_LINES[rest[0]][rest[1]]) normal = 1
      if (Object.values(cf).some(c => c % 2 === 1)) inverse = 2
      if (normal === 1) return inverse === 1 ? (parity ? 1 : 2) : parity ? 3 : 4
      return inverse === 1 ? (parity ? 3 : 4) : parity ? 5 : 2
    }
    default:
      return null
  }
}
