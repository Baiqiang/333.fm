import type { User } from './user'

export interface Competition {
  id: number
  type: CompetitionType
  name: string
  startTime: string
  endTime: string
  format: CompetitionFormat
  scrambles: Scramble[]
  status: CompetitionStatus
}

export interface PastCompetition extends Competition {
  winner: Result
}

export interface Result {
  id: number
  rank: number
  values: number[]
  best: number
  average: number
  user: User
}

export interface Scramble {
  id: number
  number: number
  scramble: string
}

export interface Submission {
  id: number
  solution: string
  comment: string
  moves: number
  scramble: Scramble
  user: User
}

export enum CompetitionType {
  WEEKLY,
  RANDOM,
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

export const DNF = 99999998
export const DNS = 99999999

export function formatResult(result: number) {
  if (result === DNF)
    return 'DNF'
  if (result === DNS)
    return 'DNS'
  return result / 100
}
