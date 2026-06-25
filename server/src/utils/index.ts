import {
  betterThan,
  calculateAverage,
  calculateMean,
  calculateTrimmedMean,
  centerLength,
  DNF,
  DNS,
  formatAlgorithm,
  getCubieCube,
  getTopDistinctN,
  getTopN,
  groupBy,
  type Rankable,
  removeComment,
  replaceQuote,
  reverseTwists,
  setRanks,
  setRanksOnly,
  sortResult,
} from '@333fm/utils'
import { createHash } from 'crypto'
import dayjs from 'dayjs'
import advancedFormat from 'dayjs/plugin/advancedFormat'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'
import weekOfYear from 'dayjs/plugin/weekOfYear'
import weekYear from 'dayjs/plugin/weekYear'
import { Algorithm, Cube } from 'insertionfinder'

import { SubmitSolutionDto } from '@/dtos/submit-solution.dto'
import { SolutionMode, SubmissionPhase, Submissions } from '@/entities/submissions.entity'

export {
  betterThan,
  calculateAverage,
  calculateMean,
  calculateTrimmedMean,
  centerLength,
  DNF,
  DNS,
  formatAlgorithm,
  getCubieCube,
  getTopDistinctN,
  getTopN,
  groupBy,
  type Rankable,
  removeComment,
  replaceQuote,
  reverseTwists,
  setRanks,
  setRanksOnly,
  sortResult,
}

dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.extend(advancedFormat)
dayjs.extend(weekOfYear)
dayjs.extend(weekYear)

// The canonical timezone all competitions are scheduled in. Day/week boundaries
// (weekly/daily/quiz generation, stats cutoffs) are anchored here so they no
// longer depend on the server's local timezone. Keep in sync with the frontend
// COMPETITION_TIMEZONE in frontend/composables/datetime.ts.
export const COMPETITION_TIMEZONE = 'Asia/Shanghai'

// Current time expressed in the competition timezone.
export function compNow(): dayjs.Dayjs {
  return dayjs().tz(COMPETITION_TIMEZONE)
}

// Today's calendar day (YYYY-MM-DD) in the competition timezone.
export function compToday(): string {
  return compNow().format('YYYY-MM-DD')
}

export const rotationString = [
  '',
  'y',
  'y2',
  "y'",
  'x',
  'x y',
  'x y2',
  "x y'",
  'x2',
  'x2 y',
  'z2',
  "x2 y'",
  "x'",
  "x' y",
  "x' y2",
  "x' y'",
  'z',
  'z y',
  'z y2',
  "z y'",
  "z'",
  "z' y",
  "z' y2",
  "z' y'",
]

export function formatSkeleton(scramble: string, skeleton: string): { formattedSkeleton: string; bestCube: Cube } {
  const cube = new Cube()
  cube.twist(new Algorithm(scramble))
  cube.twist(new Algorithm(removeComment(skeleton)))
  const bestCube = cube.getBestPlacement()
  const formattedSkeleton = formatAlgorithm(skeleton, bestCube.placement)
  return { formattedSkeleton, bestCube }
}

export function calculateHash(obj: object | Buffer | string): string {
  if (Buffer.isBuffer(obj)) {
    return createHash('md5').update(obj).digest('hex')
  }
  return createHash('md5').update(JSON.stringify(obj)).digest('hex')
}

export function calculateMoves(scramble: string, solution: string, allowNISS = false): number {
  let moves: number
  try {
    const { bestCube } = formatSkeleton(scramble, solution)
    // check if solved
    if (bestCube.isSolved()) {
      const solutionAlg = new Algorithm(replaceQuote(solution))
      moves = solutionAlg.length * 100
    } else {
      // DNF
      moves = DNF
    }
    if (!allowNISS) {
      // check NISS and ()
      if (solution.includes('NISS') || solution.includes('(')) {
        moves = DNF
      }
    }
    // check if moves > 80
    if (moves > 8000) {
      moves = DNF
    }
  } catch {
    moves = DNF
  }
  return moves
}

export function transformWCAMoves(moves: number): number {
  if (moves > 0) {
    return moves * 100
  }
  if (moves === -1) {
    return DNF
  }
  if (moves === -2) {
    return DNS
  }
  return 0
}

export function countMoves(skeleton: string): number {
  try {
    const alg = new Algorithm(skeleton)
    return alg.length * 100
  } catch {
    return 0
  }
}

export function calculatePhases(scramble: string, dto: SubmitSolutionDto, parent: Submissions | null) {
  let skeleton: string = ''
  let solution: string = dto.solution
  let moves: number = 0
  let cancelMoves: number = 0
  let cumulativeMoves: number = 0

  const parentSkeleton = flattenSkeletons(parent)
  const parentSkeletonAlg = new Algorithm(parentSkeleton)
  parentSkeletonAlg.cancelMoves()
  if ((dto.mode as any as SolutionMode) === SolutionMode.REGULAR) {
    skeleton = parentSkeleton + dto.solution
    moves = countMoves(dto.solution)
    const totalMoves = moves + parentSkeletonAlg.length * 100
    const skeletonAlg = new Algorithm(skeleton)
    skeletonAlg.cancelMoves()
    cancelMoves = totalMoves - skeletonAlg.length * 100
    cumulativeMoves = skeletonAlg.length * 100
    // cancel moves in solution
    const solutionAlg = new Algorithm(dto.solution)
    solutionAlg.normalize()
    solutionAlg.cancelMoves()
    solution = solutionAlg.toString()
  } else {
    try {
      const lastInsertion = dto.insertions[dto.insertions.length - 1]
      const lastSkeletonAlg = new Algorithm(lastInsertion.skeleton)
      const skeletonArray = lastSkeletonAlg.toString().split(' ')
      const skeletonAlg = new Algorithm(
        skeletonArray.slice(0, lastInsertion.insertPlace).join(' ') +
          lastInsertion.insertion +
          skeletonArray.slice(lastInsertion.insertPlace).join(' '),
      )
      skeletonAlg.clearFlags()
      skeletonAlg.cancelMoves()
      skeleton = skeletonAlg.toString()
      if (dto.inverse) {
        skeleton = reverseTwists(skeleton)
      }
      solution = skeleton
      moves = dto.insertions.reduce((acc, cur) => acc + countMoves(cur.insertion), 0)
      cumulativeMoves = countMoves(solution)
      cancelMoves = moves + parentSkeletonAlg.length * 100 - cumulativeMoves
    } catch {}
  }
  const { bestCube, formattedSkeleton } = formatSkeleton(scramble, skeleton)
  let phase: SubmissionPhase
  const eoStatus = bestCube.getEdgeOrientationStatus()
  const drStatus = bestCube.getDominoReductionStatus()
  if (bestCube.isSolved()) {
    phase = SubmissionPhase.FINISHED
  } else if (bestCube.isHalfTurnReductionSolved()) {
    phase = SubmissionPhase.HTR
  } else if (drStatus.length > 0) {
    phase = SubmissionPhase.DR
  } else if (eoStatus.length > 0) {
    phase = SubmissionPhase.EO
  } else {
    phase = SubmissionPhase.SCRAMBLED
  }
  // check if skeleton is LxEyC
  if (phase !== SubmissionPhase.FINISHED) {
    const cornerCycles = bestCube.getCornerCycles()
    const edgeCycles = bestCube.getEdgeCycles()
    if ((cornerCycles + edgeCycles <= 3 && !bestCube.hasParity()) || cornerCycles + edgeCycles <= 2) {
      phase = SubmissionPhase.SKELETON
    }
  } else if ((dto.mode as any as SolutionMode) === SolutionMode.INSERTIONS) {
    phase = SubmissionPhase.INSERTIONS
  } else {
    // cancel moves for inverse and normal
    cumulativeMoves = countMoves(formattedSkeleton)
  }
  // force last move to be clockwise for EO, DR and HTR
  if ([SubmissionPhase.EO, SubmissionPhase.DR, SubmissionPhase.HTR].includes(phase)) {
    const solutionAlg = new Algorithm(solution)
    solutionAlg.normalize()
    solutionAlg.cancelMoves()
    const twists = solutionAlg.twists
    const inverseTwists = solutionAlg.inverseTwists
    if (!checkLastQuarterTurns(twists, inverseTwists)) {
      moves = 0
    }
  }
  return {
    bestCube,
    phase,
    moves,
    cancelMoves,
    cumulativeMoves,
    solution,
  }
}

function checkLastQuarterTurns(twists: readonly number[], inverseTwists: readonly number[]) {
  const last = twists[twists.length - 1]
  const lastInverse = inverseTwists[inverseTwists.length - 1]
  if (last !== undefined && !isClockwise(last)) {
    return false
  }
  if (lastInverse !== undefined && !isClockwise(lastInverse)) {
    return false
  }
  if (last !== undefined && lastInverse !== undefined && !isSwapable(last, lastInverse)) {
    return false
  }
  const penultimate = twists[twists.length - 2]
  const penultimateInverse = inverseTwists[inverseTwists.length - 2]
  if (penultimate !== undefined && isSwapable(penultimate, last) && [penultimate, last].some(isHalfTurn)) {
    return false
  }
  if (
    penultimateInverse !== undefined &&
    isSwapable(penultimateInverse, lastInverse) &&
    [penultimateInverse, lastInverse].some(isHalfTurn)
  ) {
    return false
  }
  return true
}

function isSwapable(twistA: number, twistB: number) {
  return twistA >>> 3 === twistB >>> 3
}

function isClockwise(twist: number) {
  return twist % 4 === 1
}

function isHalfTurn(twist: number) {
  return twist % 4 === 2
}

export function flattenSkeletons(submission: Submissions): string {
  let parent = submission
  const skeletons: string[] = []
  while (parent) {
    skeletons.unshift(parent.solution)
    parent = parent.parent
  }
  return skeletons.join('')
}

export function parseWeek(week: string): dayjs.Dayjs {
  const matches = week.match(/^(\d{4})-(\d\d)$/)
  if (!matches) {
    return null
  }
  return dayjs.tz(matches[1], COMPETITION_TIMEZONE).week(parseInt(matches[2])).day(1)
}

export class ColumnNumericTransformer {
  to(data: number): number {
    return data
  }
  from(data: string): number {
    return parseFloat(data)
  }
}
