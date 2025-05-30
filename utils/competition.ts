import type { User } from './user'

export interface Time {
  createdAt: string
  updatedAt: string
}

export interface Competition {
  id: number
  alias: string
  type: CompetitionType
  subType: CompetitionSubType
  name: string
  startTime: string
  endTime: string
  format: CompetitionFormat
  scrambles: Scramble[]
  status: CompetitionStatus
  user: User
  prevCompetition?: Competition
  nextCompetition?: Competition
  url: string
}

export interface PastCompetition extends Competition {
  winners: Result[]
}
export interface Result {
  id: number
  rank: number
  values: number[]
  best: number
  average: number
  user: User
  mode: CompetitionMode
  rollingStart: number
  competition: Competition
  submissions: Submission[]
}

export interface Scramble extends Time {
  id: number
  number: number
  scramble: string
  cubieCube?: {
    corners: number[]
    edges: number[]
    placement: number
  }
}
export enum SubmissionPhase {
  FINISHED,
  SCRAMBLED,
  EO,
  DR,
  HTR,
  SKELETON,
  INSERTIONS,
}

export interface Attachment {
  id: number | string
  url: string
  name: string
}

export interface Submission extends Time {
  id: number
  solution: string
  insertions: ChainInsertion[]
  inverse: boolean
  comment: string
  moves: number
  cancelMoves: number
  cumulativeMoves: number
  scramble: Scramble
  competition: Competition
  user: User
  mode: CompetitionMode
  hideSolution: boolean
  likes: number
  liked: boolean
  favorites: number
  favorited: boolean

  viewed: boolean
  declined: boolean
  notification: boolean
  latestSubmitted: boolean

  phase: SubmissionPhase
  parentId: number | null
  parent: Submission | null
  continuances: number
  finishes: number
  best: number

  attachments: Attachment[]
}

export enum CompetitionType {
  WEEKLY,
  RANDOM,
  ENDLESS,
  FMC_CHAIN,
  PERSONAL_PRACTICE,
  DAILY,
  LEAGUE,
}

export enum CompetitionSubType {
  REGULAR,
  BOSS_CHALLENGE,
  EO_PRACTICE,
  DR_PRACTICE,
  HTR_PRACTICE,
}

export enum CompetitionFormat {
  MO3,
  BO1,
  BO2,
}

export enum CompetitionStatus {
  NOT_STARTED,
  ON_GOING,
  ENDED,
}

export enum CompetitionMode {
  REGULAR,
  UNLIMITED,
}

export interface Endless extends Competition {
  levels: Level[]
  challenges?: Challenge[]
}
export interface Challenge {
  single: number
  team: [number, number]
  startLevel?: number
  endLevel?: number
  levels?: number[]
}

export interface EndlessStats {
  [key: string]: any[]
}

export interface ChainStats {
  competitors: string
  total: number
  phaseCount: {
    phase: SubmissionPhase
    count: number
    competitors: string
  }[]
  top10: Submission[]
}

export interface Level {
  level: number
  competitors: number
  bestSubmissions: Submission[]
  kickedOffs: Kickoff[]
}

export interface UserProgress {
  current: Progress | null
  next: Progress
}

export interface Progress {
  level: number
  scramble: Scramble
  submission?: Submission
  kickedBy: Kickoff[]
}

export interface Kickoff extends Time {
  id: number
  user: User
  submission: Submission
}

export interface Practice extends Competition {
  attendees: number
  ownerResult: Result
}

export interface CompetitionRecord {
  single: number
  mean: number
  bestSingles: Result[]
  bestMeans: Result[]
}

export interface EndlessRecord extends Omit<CompetitionRecord, 'bestSingles' | 'bestMeans'> {
  competition: Competition
  levels: number
}

export interface SubmissionForm {
  mode: number
  solution: string
  comment: string
  attachments: Attachment[]
}

export const SYMBOL_ENDLESS = Symbol('endless')
export const SYMBOL_ENDLESS_PROGRESS = Symbol('endless.progress')
export const SYMBOL_ENDLESS_UPDATE_PROGRESS = Symbol('endless.progress.update')
export const SYMBOL_ENDLESS_UPDATE = Symbol('endless.update')

export const DNF = 99999998
export const DNS = 99999999

export function formatResult(result: number, precision = 0) {
  if (Number.isNaN(result))
    return 'N/A'

  if (!result)
    return ''
  if (result === DNF)
    return 'DNF'
  if (result === DNS)
    return 'DNS'
  return (result / 100).toFixed(precision)
}

export function aoN(results: number[], n: number = 0, mean = false) {
  if (n === 0)
    n = results.length
  if (results.length < n)
    return Number.NaN

  results = results.slice(-n)
  let total = results.reduce((a, b) => a + b, 0)
  if (!mean) {
    const best = Math.min(...results)
    const worst = Math.max(...results)
    total -= best + worst
    n -= 2
  }
  return Number((total / n).toFixed(2))
}

export function competitionPath(competition: Competition, scramble?: { number: number }, submission?: Submission) {
  const { alias, type, user } = competition
  switch (type) {
    case CompetitionType.WEEKLY:
      if (scramble)
        return `/weekly/${alias}#scramble-${scramble.number}`
      return `/weekly/${alias}`
    case CompetitionType.DAILY:
      if (scramble)
        return `/daily/${alias}#scramble-${scramble.number}`
      return `/daily/${alias}`
    case CompetitionType.ENDLESS:
      if (scramble)
        return `/endless/${alias}/${scramble.number}`
      return `/endless/${alias}`
    case CompetitionType.FMC_CHAIN:
      if (!scramble)
        return '/chain'
      if (!submission)
        return `/chain/${scramble.number}`
      return `/chain/${scramble.number}/${submission.parentId}`
    case CompetitionType.PERSONAL_PRACTICE:
      if (!user)
        return '/practice'
      if (scramble)
        return `/practice/${user.wcaId || user.id}/${alias.split('-').pop()}#scramble-${scramble.number}`
      return `/practice/${user.wcaId || user.id}/${alias.split('-').pop()}`
    case CompetitionType.LEAGUE:
      return competition.url
    default:
      return ''
  }
}
