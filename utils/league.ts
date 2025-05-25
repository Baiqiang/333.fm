export enum LeagueSessionStatus {
  NOT_STARTED,
  ON_GOING,
  ENDED,
}

export interface LeagueSession {
  id: number
  number: number
  title: string
  startTime: Date
  endTime: Date
  status: LeagueSessionStatus
  tiers: LeagueTier[]
  competitions: Competition[]
  standings: LeagueStanding[]
  players: LeaguePlayer[]
}

export interface LeagueStanding {
  id: number
  sessionId: number
  tierId: number
  userId: number
  points: number
  wins: number
  losses: number
  draws: number
  bestMo3: number
  session: LeagueSession
  tier: LeagueTier
  user: User
}

export interface LeagueTier {
  id: number
  level: string
  name: string
  sessionId: number
  session: LeagueSession
  players: LeaguePlayer[]
  duels: LeagueDuel[]
  standings: LeagueStanding[]
}

export interface LeagueStanding {
  id: number
  tierId: number
  playerId: number
  points: number
  createdAt: Date
  updatedAt: Date
  tier: LeagueTier
  player: LeaguePlayer
}

export interface LeagueDuel {
  id: number
  competitionId: number
  tierId: number
  player1Id: number
  player2Id: number
  player1Points: number
  player2Points: number
  createdAt: Date
  updatedAt: Date
  competition: Competition
  tier: LeagueTier
  player1?: LeaguePlayer
  player2?: LeaguePlayer
  player1Result?: Result
  player2Result?: Result
  ended: boolean
}

export interface TierSchedule {
  tier: LeagueTier
  schedules: LeagueDuel[]
}

export interface LeaguePlayer {
  id: number
  sessionId: number
  tierId: number
  userId: number
  session: LeagueSession
  tier: LeagueTier
  user: User
  duelsAsPlayer1: LeagueDuel[]
  duelsAsPlayer2: LeagueDuel[]
  standings: LeagueStanding[]
}

export const SYMBOL_LEAGUE_SESSION: InjectionKey<Ref<LeagueSession>> = Symbol('leagueSession')

export function leagueWeek(competition: Competition) {
  return competition.alias.split('-')[2]
}

export function leagueWeekPoints(player1Points: number, player2Points: number) {
  if (player1Points + player2Points === 0) {
    return '-'
  }
  if (player1Points > player2Points) {
    return 2
  }
  if (player1Points === player2Points) {
    return 1
  }
  return 0
}

export const tierBackgrounds = [
  'bg-sky-200',
  'bg-red-200',
  'bg-green-200',
  'bg-purple-200',
  'bg-yellow-200',
]
