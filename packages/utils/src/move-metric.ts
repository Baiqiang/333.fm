import { Algorithm, Cube } from 'insertionfinder'

import { removeComment } from './algorithm'
import { CompetitionSubType } from './competition'
import { DNF } from './result'

export enum MoveMetric {
  HTM = 'HTM',
  QTM = 'QTM',
  STM = 'STM',
  ATM = 'ATM',
}

export interface SolutionScore {
  moves: number
  solved: boolean
  centersRestored: boolean | null
}

const FUN_CHALLENGE_LABELS: Partial<Record<CompetitionSubType, string>> = {
  [CompetitionSubType.QTM_CHALLENGE]: 'QTM Challenge',
  [CompetitionSubType.STM_CHALLENGE]: 'STM Challenge',
  [CompetitionSubType.ATM_CHALLENGE]: 'ATM Challenge',
  [CompetitionSubType.CENTER_SOLVED_CHALLENGE]: 'Center Solved Challenge',
}

const FUN_CHALLENGE_SLUGS: Partial<Record<CompetitionSubType, string>> = {
  [CompetitionSubType.QTM_CHALLENGE]: 'qtm',
  [CompetitionSubType.STM_CHALLENGE]: 'stm',
  [CompetitionSubType.ATM_CHALLENGE]: 'atm',
  [CompetitionSubType.CENTER_SOLVED_CHALLENGE]: 'center-solved',
}

export function isFunChallengeSubType(subType: number): subType is CompetitionSubType {
  return subType in FUN_CHALLENGE_LABELS
}

export function isCenterSolvedChallenge(subType: number): boolean {
  return subType === CompetitionSubType.CENTER_SOLVED_CHALLENGE
}

export function funChallengeLabel(subType: CompetitionSubType): string {
  return FUN_CHALLENGE_LABELS[subType] || 'Fun Challenge'
}

export function funChallengeSlug(subType: CompetitionSubType): string {
  return FUN_CHALLENGE_SLUGS[subType] || 'fun'
}

export function funChallengeMetric(subType: CompetitionSubType): MoveMetric {
  switch (subType) {
    case CompetitionSubType.QTM_CHALLENGE:
      return MoveMetric.QTM
    case CompetitionSubType.STM_CHALLENGE:
      return MoveMetric.STM
    case CompetitionSubType.ATM_CHALLENGE:
      return MoveMetric.ATM
    default:
      return MoveMetric.HTM
  }
}

export function centersRestored(sequence: string): boolean {
  const counts = getFaceTurnCounts(sequence)
  return counts !== null && counts.every(count => count === 0)
}

export function calculateSolutionScore(
  scramble: string,
  solution: string,
  metric = MoveMetric.HTM,
  options: { requireCentersRestored?: boolean } = {},
): SolutionScore {
  const centers = options.requireCentersRestored ? centersRestored(`${scramble} ${solution}`) : null
  try {
    if (solution.includes('NISS') || solution.includes('(')) {
      return { moves: DNF, solved: false, centersRestored: centers }
    }

    const cleanSolution = removeComment(solution)
    const cube = new Cube()
    cube.twist(new Algorithm(scramble))
    cube.twist(new Algorithm(cleanSolution))
    if (!cube.getBestPlacement().isSolved()) {
      return { moves: DNF, solved: false, centersRestored: centers }
    }
    if (options.requireCentersRestored && !centers) {
      return { moves: DNF, solved: true, centersRestored: false }
    }

    const moves = calculateMoveMetric(cleanSolution, metric) * 100
    return {
      moves: moves > 8000 ? DNF : moves,
      solved: true,
      centersRestored: centers,
    }
  } catch {
    return { moves: DNF, solved: false, centersRestored: centers }
  }
}

export function calculateMoveMetric(sequence: string, metric = MoveMetric.HTM): number {
  const algorithm = new Algorithm(removeComment(sequence))
  switch (metric) {
    case MoveMetric.QTM:
      return algorithm.twists.reduce((sum, twist) => sum + (isHalfTurn(twist) ? 2 : 1), 0)
    case MoveMetric.ATM:
      return countAxialTurns(algorithm.twists)
    case MoveMetric.STM:
    case MoveMetric.HTM:
    default:
      return algorithm.length
  }
}

function isHalfTurn(twist: number): boolean {
  return twist % 4 === 2
}

function countAxialTurns(twists: readonly number[]): number {
  let count = 0
  let currentAxis: number | null = null
  for (const twist of twists) {
    const axis = twist >>> 3
    if (axis !== currentAxis) {
      count++
      currentAxis = axis
    }
  }
  return count
}

function getFaceTurnCounts(sequence: string): number[] | null {
  try {
    const alg = new Algorithm(removeComment(sequence))
    alg.clearFlags(0)
    const counts = [0, 0, 0, 0, 0, 0]
    for (const twist of alg.twists) {
      const face = twist >> 2
      const qt = twist % 4
      if (qt === 0 || face < 0 || face >= counts.length) continue
      counts[face] = (counts[face] + qt) % 4
    }
    return counts
  } catch {
    return null
  }
}
