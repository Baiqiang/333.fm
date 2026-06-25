import {
  aoN,
  competitionPath as sharedCompetitionPath,
  DNF,
  DNS,
  formatResult,
  submissionLink as sharedSubmissionLink,
} from '@333fm/utils'
import type { User } from './user'

export { aoN, DNF, DNS, formatResult }

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
  description?: string | null
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
  userId: number
  user: User
  mode: CompetitionMode
  rollingStart: number
  competitionId: number
  competition: Competition
  submissions: Submission[]
}

export interface Scramble extends Time {
  id: number
  number: number
  scramble: string
  currentHP?: number
  initialHP?: number
  cubieCube?: {
    corners: number[]
    edges: number[]
    placement: number
  }
  roundNumber?: number
  verified?: boolean
  submittedById?: number | null
  competitionId?: number
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
  userId: number
  solution: string
  insertions: ChainInsertion[]
  inverse: boolean
  comment: string
  moves: number
  damage?: number
  bossInstantKill?: boolean
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
  commentCount: number

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

  verified: boolean

  wcaMoves?: number | null
  scrambleId?: number
}

export interface SubmissionFilter {
  key: CompetitionMode | string
  label: string
  filter?: (submission: Submission) => boolean
}

export enum CompetitionType {
  WEEKLY,
  RANDOM,
  ENDLESS,
  FMC_CHAIN,
  PERSONAL_PRACTICE,
  DAILY,
  LEAGUE,
  WCA_RECONSTRUCTION,
}

export enum CompetitionSubType {
  REGULAR,
  BOSS_CHALLENGE,
  EO_PRACTICE,
  DR_PRACTICE,
  HTR_PRACTICE,
  HIDDEN_SCRAMBLE,
  JZP_PRACTICE,
  MYSTERY,
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
export enum ChallengeType {
  REGULAR,
  BOSS,
}

export interface RegularChallengeRule {
  single: number
  team: [number, number]
}

export interface BossChallengeRule {
  instantKill: number
  minHitPoints: number
  maxHitPoints: number
}

export interface BaseChallenge {
  type: ChallengeType
  startLevel?: number
  endLevel?: number
  levels?: number[]
}

export type Challenge =
  | (BaseChallenge & {
    type: ChallengeType.REGULAR
    challenge: RegularChallengeRule
  })
  | (BaseChallenge & {
    type: ChallengeType.BOSS
    challenge: BossChallengeRule
  })

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

export enum ConditionType {
  MOVES_EQUAL = 'moves-equal',
  MOVES_LE = 'moves-le',
  MOVES_GE = 'moves-ge',
  MOVES_PARITY = 'moves-parity',
  SAME_SOLUTION = 'same-solution',
  SAME_MOVES = 'same-moves',
  ALL_DIFFERENT_MOVES = 'all-different-moves',
  TOTAL_SUBMISSIONS = 'total-submissions',
  CONSECUTIVE_MOVES = 'consecutive-moves',
}

export enum ParityType {
  EVEN = 'even',
  ODD = 'odd',
  MULTIPLE_OF_3 = 'multiple-of-3',
  MULTIPLE_OF_5 = 'multiple-of-5',
  MULTIPLE_OF_7 = 'multiple-of-7',
}

export interface ConditionInfo {
  id: number
  type: ConditionType
  revealed: boolean
  autoRevealed: boolean
  revealedAt: string | null
  triggeredByUser: User | null
  contributors?: { userId: number, submissionId: number }[]
  description?: string
  params?: any
}

export interface Level {
  level: number
  competitors: number
  bestSubmissions: Submission[]
  kickedOffs: Kickoff[]
  conditions?: ConditionInfo[]
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
  dnfPenalty?: boolean
  conditions?: ConditionInfo[]
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

export function competitionPath(competition: Competition, scramble?: { number: number, roundNumber?: number }, submission?: Submission) {
  return sharedCompetitionPath(competition, scramble, submission)
}

export function competitionName(competition: Competition, scramble?: { number: number, roundNumber?: number }) {
  const { t, locale } = useI18n()
  const competitionIndex = competition.alias.split('-').pop()
  switch (competition.type) {
    case CompetitionType.WEEKLY:
      return `${t('weekly.title')} ${competition.alias}`
    case CompetitionType.DAILY:
      return `${t('daily.title')} ${competition.alias}`
    case CompetitionType.LEAGUE:
      return `${t('league.title')} ${leagueWeekName(competition)}`
    case CompetitionType.PERSONAL_PRACTICE:
      return t('practice.user.index', { name: localeName(competition.user.name, locale.value), index: competitionIndex })
    case CompetitionType.ENDLESS:
      if (scramble)
        return `${competition.name} ${t('endless.level', { level: scramble.number })}`
      return `${competition.name}`
    case CompetitionType.WCA_RECONSTRUCTION:
      if (scramble)
        return `${competition.name} R${scramble.roundNumber}-A${scramble.number}`
      return `${competition.name}`
    default:
      return competition.name
  }
}

export function submissionLink(competition: Competition, scramble?: { number: number }, submission?: Submission) {
  return sharedSubmissionLink(competition, scramble, submission)
}

export function isInStatus(competition: Competition, status: CompetitionStatus) {
  const now = new Date()
  const startTime = new Date(competition.startTime)
  const endTime = new Date(competition.endTime)
  switch (status) {
    case CompetitionStatus.ON_GOING:
      return (now >= startTime && now <= endTime) || competition.status === CompetitionStatus.ON_GOING
    case CompetitionStatus.ENDED:
      return now > endTime || competition.status === CompetitionStatus.ENDED
    case CompetitionStatus.NOT_STARTED:
      return now < startTime || competition.status === CompetitionStatus.NOT_STARTED
    default:
      return false
  }
}
