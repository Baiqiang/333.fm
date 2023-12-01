import { Algorithm } from 'insertionfinder'

export enum IFType {
  INSERTION_FINDER = 0,
  SLICEY_FINDER = 1,
}

export enum IFStatus {
  PENDING = 0,
  COMPUTING = 1,
  FINISHED = 2,
}

export interface InsertionFinder {
  type: IFType
  name: string
  hash: string
  scramble: string
  skeleton: string
  realSkeleton: string
  greedy: number
  algs: string[]
  totalCycles: number
  cycles: Cycles
  cycleDetail: CycleDetail
  result: IFResult
  status: IFStatus
  createdAt: string
}

export interface AdminIF extends InsertionFinder {
  users: User[]
}

export interface Cycles {
  edges: number
  corners: number
  centers: number
  parity: boolean
}

export interface CycleDetail {
  edge: Edge[]
  center: Center[]
  corner: Corner[]
}

export interface Edge {
  flip: number
  length: number
}

export interface Center {
  length: number
}

export interface Corner {
  length: number
  orientation: number
}

export interface IFResult {
  parity?: boolean
  duration: number
  scramble?: string
  skeleton: string
  solutions: Solution[]
  edge_cycles?: number
  fewest_moves: number
  center_cycles?: number
  corner_cycles?: number
}

export interface Solution {
  insertions: Insertion[]
  formatedInsertions: FormatedInsertion[]
  cancellation: number
  final_solution: string
  merged_insertions: MergedInsertion[]
  formatedMergedInsertions: FormatedInsertion[]
}

export interface Insertion {
  skeleton: string
  insertion: string
  insert_place: number
}

export interface FormatedInsertion {
  skeleton: string
  formattedSkeleton: string
  insertions: FormatedInsertionDetail[]
}

export interface FormatedInsertionDetail {
  place: number
  cancelled: number
  formattedInsertion: string
  insertionSymbol: string
}

export interface MergedInsertion {
  skeleton: string
  insertions: OrderedInsertion[]
}

export interface OrderedInsertion {
  algorithms: OrderedAlgorithm[]
  insert_place: number
}

export interface OrderedAlgorithm {
  order: number
  algorithm: string
  cumulative_order: number
}

export enum MARKS {
  NONE,
  MERGED,
  CANCELLED,
}

export const emojis = [
  ['😡', '😭', '😰'],
  ['😑', '😒', '🙄'],
  ['😃', '😋', '😶'],
  ['😆', '😬', '😉'],
  ['😇', '😁', '😜'],
  ['😮', '🤠', '😎'],
  ['🤩', '😏', '🤗'],
  ['😍', '🤑', '😲'],
  ['👻', '👽', '👾'],
  ['😱'],
  ['😻'],
]

export function calcMarks(...algs: (string | string[])[]): MARKS[] {
  return new Algorithm(algs.map(alg => Array.isArray(alg) ? alg.join('') : alg).join('')).cancelMoves() as MARKS[]
}

export function applyMarks(algs: string[][], marks: MARKS[]) {
  let k = 0
  for (let i = 0; i < algs.length; i++) {
    const moves = algs[i]
    for (let j = 0; j < moves.length; j++) {
      // skip rotations
      if (isRotation(moves[j]))
        continue

      moves[j] = applyMark(moves[j], marks[k++])
    }
  }
}

export function applyMark(alg: string, mark: MARKS) {
  switch (mark) {
    case MARKS.MERGED:
      return `<span class="bg-blue-400">${alg}</span>`
    case MARKS.CANCELLED:
      return `<span class="line-through decoration-red-500/70 decoration-2">${alg}</span>`
    default:
      return alg
  }
}

export function replaceQuote(string: string): string {
  return string.replace(/[‘’`]/g, '\'')
}

export function formatAlgorithm(string: string | string[], placement: number = 0) {
  string = removeComment(string)
  const algorithm = new Algorithm(string)
  algorithm.clearFlags(placement)
  algorithm.normalize()
  return algorithm.toString()
}

export function formatAlgorithmToArray(string: string | string[]) {
  return formatAlgorithm(string).split(' ').filter(a => a !== '')
}

export function removeComment(string: string | string[]) {
  if (Array.isArray(string))
    string = string.join(' ')

  // remove comments
  string = replaceQuote(string)
  return string.split('\n').map(s => s.split('//')[0]).join('')
}

export function isSwappable(a: string, b: string) {
  if (!a || !b)
    return false

  const alg = new Algorithm(`${a} ${b}`)
  return alg.twists[0] >>> 3 === alg.twists[1] >>> 3
}

export function isSameFace(a: string, b: string): boolean {
  if (!a || !b)
    return false
  return a.charAt(0) === b.charAt(0)
}

export function isRotation(a?: string): boolean {
  if (!a)
    return false
  return 'xyz'.includes(a.charAt(0))
}

export function centerLength(centerCycles: number, placement: number): number {
  return centerCycles === 3 ? 6 : centerCycles === 2 ? 4 : [2, 8, 10].includes(placement) ? 4 : 6
}

export function algLength(alg: string) {
  return alg.split(' ').filter(a => a !== '').length
}

export function getPagination(total: number, page: string | number) {
  const perPage = 12
  if (typeof page === 'string')
    page = Number.parseInt(page)

  if (Number.isNaN(page))
    page = 1

  if (page < 1)
    page = 1

  if (page > Math.ceil(total / perPage))
    page = Math.ceil(total / perPage)

  let offset = (page - 1) * perPage
  if (offset < 0)
    offset = 0

  return {
    limit: perPage,
    offset,
  }
}

export function getBadgeClass(alg: string) {
  switch (alg) {
    case '3CP':
    case '3CP-pure':
    case '2x2CP':
    case 'CO':
    case 'C-other':
      return 'bg-orange-500'
    case '3EP':
    case '2x2EP':
    case 'EO':
    case 'E-other':
      return 'text-white bg-blue-500'
    case 'parity':
    case 'extras/parity':
      return 'text-white bg-red-500'
    case 'center':
      return 'text-white bg-cyan-500'
    case '3CP3EP':
      return 'text-white bg-green-500'
    case 'no-parity-other':
    case 'extras/no-parity-other':
      return 'text-white bg-pink-500'
  }
}
