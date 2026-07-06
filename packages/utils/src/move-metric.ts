import { Algorithm, Cube } from 'insertionfinder'

import { removeComment, replaceQuote } from './algorithm'
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

const ROTATION_FACES = new Set(['X', 'Y', 'Z'])
const X_AXIS_FACES = new Set(['R', 'L', 'M'])
const Y_AXIS_FACES = new Set(['U', 'D', 'E'])
const Z_AXIS_FACES = new Set(['F', 'B', 'S'])

interface MoveToken {
  face: string
  halfTurn: boolean
  rotation: boolean
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
  const tokens = tokenizeMoves(sequence)
  switch (metric) {
    case MoveMetric.QTM:
      return tokens.reduce((sum, token) => sum + (token.rotation ? 0 : token.halfTurn ? 2 : 1), 0)
    case MoveMetric.ATM:
      return countAxialTurns(tokens)
    case MoveMetric.STM:
    case MoveMetric.HTM:
    default:
      return tokens.filter(token => !token.rotation).length
  }
}

function tokenizeMoves(sequence: string): MoveToken[] {
  const clean = removeComment(sequence)
  if (!clean.trim()) return []

  return clean
    .split(/\s+/)
    .filter(Boolean)
    .map((rawToken) => {
      const token = replaceQuote(rawToken)
      const match = token.match(/^([URFDLBMESxyzurfdlb])w?(2|'|2')?$/)
      if (!match) throw new Error(`Unsupported move: ${rawToken}`)

      const face = match[1].toUpperCase()
      return {
        face,
        halfTurn: token.includes('2'),
        rotation: ROTATION_FACES.has(face),
      }
    })
}

function countAxialTurns(tokens: MoveToken[]): number {
  let count = 0
  let currentAxis: string | null = null
  for (const token of tokens) {
    if (token.rotation) continue

    const axis = axisOf(token.face)
    if (axis !== currentAxis) {
      count++
      currentAxis = axis
    }
  }
  return count
}

function axisOf(face: string): string {
  if (X_AXIS_FACES.has(face)) return 'x'
  if (Y_AXIS_FACES.has(face)) return 'y'
  if (Z_AXIS_FACES.has(face)) return 'z'
  throw new Error(`Unsupported move face: ${face}`)
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
