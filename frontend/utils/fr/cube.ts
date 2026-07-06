/**
 * Pure geometric 3x3x3 cube model (independent of cubing.js; used only for FR analysis and solving).
 *
 * Coordinates: x(R=+1,L=-1), y(U=+1,D=-1), z(F=+1,B=-1).
 * State is 54 sticker colors (face letters) in fixed LOCS order.
 *
 * Base clockwise turn directions are validated end-to-end against real cube notation.
 */

export type Face = 'U' | 'D' | 'R' | 'L' | 'F' | 'B'
export type CubeState = Face[]
export type AxisIndex = 0 | 1 | 2 // 0=x(RL) 1=y(UD) 2=z(FB)

interface FaceDef {
  letter: Face
  axis: AxisIndex
  sign: 1 | -1
}

export const FACES: FaceDef[] = [
  { letter: 'U', axis: 1, sign: 1 },
  { letter: 'D', axis: 1, sign: -1 },
  { letter: 'R', axis: 0, sign: 1 },
  { letter: 'L', axis: 0, sign: -1 },
  { letter: 'F', axis: 2, sign: 1 },
  { letter: 'B', axis: 2, sign: -1 },
]

/** Quarter-turn count for a base clockwise face turn (validated end-to-end). */
const FACE_DIRECTION: Record<Face, 1 | 3> = {
  U: 3,
  D: 1,
  R: 3,
  L: 1,
  F: 3,
  B: 1,
}

export function faceByAxisSign(axis: AxisIndex, sign: number): Face {
  const f = FACES.find(x => x.axis === axis && x.sign === sign)
  if (!f) throw new Error(`invalid face axis=${axis} sign=${sign}`)
  return f.letter
}

/** Axis that a face-letter color belongs to. */
export function colorAxis(color: Face): AxisIndex {
  if (color === 'U' || color === 'D') return 1
  if (color === 'R' || color === 'L') return 0
  return 2
}

type Vec3 = [number, number, number]

function rot90(v: Vec3, axis: AxisIndex): Vec3 {
  const [x, y, z] = v
  if (axis === 0) return [x, -z, y]
  if (axis === 1) return [z, y, -x]
  return [-y, x, z]
}
function rotN(v: Vec3, axis: AxisIndex, times: number): Vec3 {
  let r = v
  const t = ((times % 4) + 4) % 4
  for (let i = 0; i < t; i++) r = rot90(r, axis)
  return r
}

export interface StickerLoc {
  coord: Vec3
  normal: Vec3
  color: Face
}

function buildLocations(): StickerLoc[] {
  const locs: StickerLoc[] = []
  for (const f of FACES) {
    for (let a = -1; a <= 1; a++) {
      for (let b = -1; b <= 1; b++) {
        const coord: Vec3 = [0, 0, 0]
        coord[f.axis] = f.sign
        const others = ([0, 1, 2] as AxisIndex[]).filter(i => i !== f.axis)
        coord[others[0]] = a
        coord[others[1]] = b
        const normal: Vec3 = [0, 0, 0]
        normal[f.axis] = f.sign
        locs.push({ coord, normal, color: f.letter })
      }
    }
  }
  return locs
}

export const LOCS: StickerLoc[] = buildLocations()
const keyOf = (coord: Vec3, normal: Vec3) =>
  `${coord.join(',')}|${normal.join(',')}`
const LOC_INDEX = new Map<string, number>(
  LOCS.map((l, i) => [keyOf(l.coord, l.normal), i]),
)

export const SOLVED: CubeState = LOCS.map(l => l.color)

type Perm = number[]

function buildFacePerm(face: FaceDef, dir: 1 | 3): Perm {
  const perm: Perm = new Array(54)
  for (let i = 0; i < 54; i++) {
    const l = LOCS[i]
    if (l.coord[face.axis] !== face.sign) {
      perm[i] = i
      continue
    }
    const inv = ((4 - dir) % 4) as 1 | 3
    const preCoord = rotN(l.coord, face.axis, inv)
    const preNormal = rotN(l.normal, face.axis, inv)
    const idx = LOC_INDEX.get(keyOf(preCoord, preNormal))
    if (idx === undefined) throw new Error('perm build failed')
    perm[i] = idx
  }
  return perm
}

function composePerm(p1: Perm, p2: Perm): Perm {
  const out: Perm = new Array(54)
  for (let i = 0; i < 54; i++) out[i] = p1[p2[i]]
  return out
}

const FACE_PERM: Record<Face, Perm> = {} as Record<Face, Perm>
for (const f of FACES) FACE_PERM[f.letter] = buildFacePerm(f, FACE_DIRECTION[f.letter])

/** Half-turn permutations (U2 D2 R2 L2 F2 B2). */
export const HALF_TURN: Record<Face, Perm> = {} as Record<Face, Perm>
for (const f of FACES)
  HALF_TURN[f.letter] = composePerm(FACE_PERM[f.letter], FACE_PERM[f.letter])

export function applyPerm(state: CubeState, perm: Perm): CubeState {
  const out: CubeState = new Array(54)
  for (let i = 0; i < 54; i++) out[i] = state[perm[i]]
  return out
}

const MOVE_TOKEN = /^([UDRLFB])(2|')?$/

export class ScrambleParseError extends Error {}

function permForToken(token: string): Perm {
  const m = MOVE_TOKEN.exec(token)
  if (!m) throw new ScrambleParseError(token)
  const base = m[1] as Face
  const suffix = m[2]
  const p = FACE_PERM[base]
  if (suffix === '2') return composePerm(p, p)
  if (suffix === '\'') return composePerm(p, composePerm(p, p))
  return p
}

/** Parse and apply a scramble (only U D R L F B with ' / 2 supported). */
export function applyScramble(scramble: string): CubeState {
  let st = SOLVED.slice()
  const tokens = scramble.trim().split(/\s+/).filter(Boolean)
  for (const tok of tokens) {
    st = applyPerm(st, permForToken(tok))
  }
  return st
}

/** Apply a sequence of moves (e.g. ["R2","F2"]) on a given state. */
export function applyMoves(state: CubeState, moves: string[]): CubeState {
  let st = state
  for (const m of moves) st = applyPerm(st, permForToken(m))
  return st
}

export function isValidToken(token: string): boolean {
  return MOVE_TOKEN.test(token)
}

// ---- Cubie grouping ----
export interface Cubie {
  coord: Vec3
  stickers: number[] // sticker location indices
}

function collectCubies(zeros: number): Cubie[] {
  const map = new Map<string, Cubie>()
  for (let i = 0; i < 54; i++) {
    const c = LOCS[i].coord
    if (c.filter(v => v === 0).length === zeros) {
      const k = c.join(',')
      let cu = map.get(k)
      if (!cu) {
        cu = { coord: c, stickers: [] }
        map.set(k, cu)
      }
      cu.stickers.push(i)
    }
  }
  return [...map.values()]
}

export const CORNER_CUBIES: Cubie[] = collectCubies(0)
export const EDGE_CUBIES: Cubie[] = collectCubies(1)

export interface StickerView {
  normal: Vec3
  color: Face
}
export interface CubieView {
  coord: Vec3
  colors: StickerView[]
}

export function cornersOf(state: CubeState): CubieView[] {
  return CORNER_CUBIES.map(cc => ({
    coord: cc.coord,
    colors: cc.stickers.map(si => ({ normal: LOCS[si].normal, color: state[si] })),
  }))
}
export function edgesOf(state: CubeState): CubieView[] {
  return EDGE_CUBIES.map(ec => ({
    coord: ec.coord,
    colors: ec.stickers.map(si => ({ normal: LOCS[si].normal, color: state[si] })),
  }))
}
