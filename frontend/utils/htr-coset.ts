import { Algorithm, Cube } from 'insertionfinder'

import { getDRDescription } from './cube'

/**
 * DR-UD states modulo the HTR group <U2, D2, R2, L2, F2, B2>.
 *
 * A coset is identified by (corner coset, edge mask):
 * - corner coset: the corner permutation up to relabelling by the 96 HTR corner permutations (420 cosets)
 * - edge mask: which U/D edge positions hold an R/L-slice edge (70 masks)
 * Every coset has the same number of states, and the optimal HTR length only depends on the coset.
 */

const DR_MOVES = ['U', 'U\'', 'U2', 'D', 'D\'', 'D2', 'R2', 'L2', 'F2', 'B2']
const HALF_TURNS = ['U2', 'D2', 'R2', 'L2', 'F2', 'B2']
const QUARTER_TURN_INDEXES = [0, 1, 3, 4]

/** Facelet indexes of corner positions UBL, UBR, UFR, UFL, DFL, DFR, DBR, DBL. */
const CORNER_FACELETS = [
  [0, 27, 47],
  [2, 20, 45],
  [8, 18, 38],
  [6, 29, 36],
  [9, 35, 42],
  [11, 24, 44],
  [17, 26, 51],
  [15, 33, 53],
]
/** Facelet indexes of edge positions UB, UR, UF, UL, DF, DR, DB, DL. */
const EDGE_FACELETS = [
  [1, 46],
  [5, 19],
  [7, 37],
  [3, 28],
  [10, 43],
  [14, 25],
  [16, 52],
  [12, 34],
]
/** Edges that belong to the R/L slice: UR, UL, DR, DL. */
const SLICE_EDGES = [1, 3, 5, 7]
const CENTER_FACELETS: Record<string, number> = { U: 4, D: 13, R: 22, L: 31, F: 40, B: 49 }
const AXIS_ROTATIONS: Record<string, string> = { UD: '', RL: 'z', FB: 'x' }

export interface DRPieces {
  corners: number[]
  edges: number[]
}

function pieceKey(facelets: string, indexes: number[]) {
  return indexes.map(i => facelets[i]).sort().join('')
}

/** Piece at each position, numbered by home position in `reference`. Null if not a DR-UD state. */
export function readDRPieces(facelets: string, reference: string): DRPieces | null {
  const read = (table: number[][]) => {
    const home = new Map(table.map((indexes, i) => [pieceKey(reference, indexes), i]))
    const pieces = table.map(indexes => home.get(pieceKey(facelets, indexes)) ?? -1)
    return pieces.includes(-1) ? null : pieces
  }
  const corners = read(CORNER_FACELETS)
  const edges = read(EDGE_FACELETS)
  return corners && edges ? { corners, edges } : null
}

function edgeMask(edges: number[]) {
  return edges.reduce((mask, piece, pos) => SLICE_EDGES.includes(piece) ? mask | (1 << pos) : mask, 0)
}

function invertMove(move: string) {
  if (move.endsWith('2'))
    return move
  return move.endsWith('\'') ? move[0] : `${move}'`
}

export interface HTRCosetTable {
  /** Number of cosets. */
  size: number
  distance: Uint8Array
  cornerCoset: Uint16Array
  edgeMask: Uint8Array
  /** Raw corner subset (e.g. 4a3, 6c4) of each corner coset. */
  cornerSubsets: string[]
  /** Number of bad edges of each coset (0-8). */
  badEdges: Uint8Array
  /** Coset reached by each DR move. */
  next: (coset: number, move: number) => number
  /** Moves from solved to some state of the coset. */
  pathTo: (coset: number) => string[]
  /** Optimal HTR solution from any state of the coset. */
  solve: (coset: number) => string[]
  cosetOf: (pieces: DRPieces) => number
  moves: string[]
  quarterTurnIndexes: number[]
}

let table: HTRCosetTable | undefined

export function getHTRCosetTable(): HTRCosetTable {
  table ??= buildTable()
  return table
}

function buildTable(): HTRCosetTable {
  const solved = new Cube().toFaceletString()
  const moveTables = DR_MOVES.map((move) => {
    const cube = new Cube()
    cube.twist(new Algorithm(move))
    return readDRPieces(cube.toFaceletString(), solved)!
  })
  const apply = (perm: number[], move: number[]) => move.map(src => perm[src])

  const halfTurnGroup: number[][] = [[0, 1, 2, 3, 4, 5, 6, 7]]
  const halfTurnSeen = new Set([halfTurnGroup[0].join('')])
  for (let i = 0; i < halfTurnGroup.length; i++) {
    for (const move of HALF_TURNS) {
      const next = apply(halfTurnGroup[i], moveTables[DR_MOVES.indexOf(move)].corners)
      const key = next.join('')
      if (!halfTurnSeen.has(key)) {
        halfTurnSeen.add(key)
        halfTurnGroup.push(next)
      }
    }
  }

  const cornerCosetOfPerm = new Map<string, number>()
  const cornerReps: number[][] = []
  const cornerCosetOf = (perm: number[]) => {
    const key = perm.join('')
    let id = cornerCosetOfPerm.get(key)
    if (id === undefined) {
      id = cornerReps.length
      cornerReps.push(perm)
      for (const h of halfTurnGroup)
        cornerCosetOfPerm.set(perm.map(p => h[p]).join(''), id)
    }
    return id
  }

  const masks: number[] = []
  for (let mask = 0; mask < 256; mask++) {
    let bits = 0
    for (let i = 0; i < 8; i++) bits += (mask >> i) & 1
    if (bits === 4)
      masks.push(mask)
  }
  const maskIndex = new Map(masks.map((mask, i) => [mask, i]))
  const applyMask = (mask: number, move: number[]) => move.reduce((out, src, pos) => (mask >> src) & 1 ? out | (1 << pos) : out, 0)

  const encode = (corner: number, mask: number) => corner * masks.length + maskIndex.get(mask)!
  const cornerNext: number[][] = []
  const cornerNextOf = (corner: number, move: number) => {
    cornerNext[corner] ??= []
    cornerNext[corner][move] ??= cornerCosetOf(apply(cornerReps[corner], moveTables[move].corners))
    return cornerNext[corner][move]
  }
  const maskNext = masks.map(mask => moveTables.map(t => applyMask(mask, t.edges)))

  const start = encode(cornerCosetOf([0, 1, 2, 3, 4, 5, 6, 7]), edgeMask([0, 1, 2, 3, 4, 5, 6, 7]))
  const capacity = 420 * masks.length
  const distance = new Uint8Array(capacity).fill(255)
  const parentMove = new Int8Array(capacity).fill(-1)
  const parent = new Int32Array(capacity).fill(-1)
  const next = (coset: number, move: number) => {
    const corner = Math.floor(coset / masks.length)
    const mask = masks[coset % masks.length]
    return encode(cornerNextOf(corner, move), maskNext[maskIndex.get(mask)!][move])
  }
  distance[start] = 0
  const queue = [start]
  for (let i = 0; i < queue.length; i++) {
    const coset = queue[i]
    for (let move = 0; move < DR_MOVES.length; move++) {
      const target = next(coset, move)
      if (distance[target] !== 255)
        continue
      distance[target] = distance[coset] + 1
      parent[target] = coset
      parentMove[target] = move
      queue.push(target)
    }
  }
  if (queue.length !== capacity || cornerReps.length !== 420)
    throw new Error(`Unexpected coset count: ${queue.length}, ${cornerReps.length}`)

  const pathTo = (coset: number) => {
    const moves: string[] = []
    for (let c = coset; c !== start; c = parent[c])
      moves.push(DR_MOVES[parentMove[c]])
    return moves.reverse()
  }

  const cornerCoset = new Uint16Array(capacity)
  const masksOfCoset = new Uint8Array(capacity)
  const badEdges = new Uint8Array(capacity)
  for (let coset = 0; coset < capacity; coset++) {
    const mask = masks[coset % masks.length]
    cornerCoset[coset] = Math.floor(coset / masks.length)
    masksOfCoset[coset] = mask
    badEdges[coset] = SLICE_EDGES.filter(pos => !((mask >> pos) & 1)).length * 2
  }
  const cornerSubsets = cornerReps.map((_, corner) => {
    const d = getDRDescription(pathTo(encode(corner, masks[0])).join(' '))
    return d.corners === 4 ? `4${d.cornerState.normal === 1 ? 'a' : 'b'}${d.qt}` : `${d.corners}c${d.qt}`
  })

  return {
    size: capacity,
    distance,
    cornerCoset,
    edgeMask: masksOfCoset,
    cornerSubsets,
    badEdges,
    next,
    pathTo,
    solve: coset => pathTo(coset).reverse().map(invertMove),
    cosetOf: pieces => encode(cornerCosetOf(pieces.corners), edgeMask(pieces.edges)),
    moves: DR_MOVES,
    quarterTurnIndexes: QUARTER_TURN_INDEXES,
  }
}

export interface DRCosetInfo {
  coset: number
  /** Raw corner subset, e.g. 4a3. */
  subset: string
  badEdges: number
  /** Optimal HTR solution in the original orientation. */
  solution: string[]
}

/** Locate the HTR coset of the DR reached by `algorithm`, on any DR axis. */
export function getDRCosetInfo(algorithm: string): DRCosetInfo | null {
  let cube: Cube
  try {
    cube = new Cube()
    cube.twist(new Algorithm(algorithm))
  }
  catch {
    return null
  }
  const axis = cube.getDominoReductionStatus()[0]
  if (!axis)
    return null
  const rotation = AXIS_ROTATIONS[axis]
  if (rotation)
    cube.twist(new Algorithm(rotation))
  const referenceCube = new Cube()
  if (rotation)
    referenceCube.twist(new Algorithm(rotation))
  const reference = referenceCube.toFaceletString()
  const pieces = readDRPieces(cube.toFaceletString(), reference)
  if (!pieces)
    return null
  const t = getHTRCosetTable()
  const coset = t.cosetOf(pieces)
  return {
    coset,
    subset: t.cornerSubsets[t.cornerCoset[coset]],
    badEdges: t.badEdges[coset],
    solution: t.solve(coset).map(move => reference[CENTER_FACELETS[move[0]]] + move.slice(1)),
  }
}
