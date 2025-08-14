export enum LeagueSeasonStatus {
  NOT_STARTED,
  ON_GOING,
  ENDED,
}

export interface LeagueSeason {
  id: number
  number: number
  title: string
  startTime: Date
  endTime: Date
  status: LeagueSeasonStatus
  tiers: LeagueTier[]
  competitions: Competition[]
  standings: LeagueStanding[]
  players: LeaguePlayer[]
}

export interface LeagueStanding {
  id: number
  seasonId: number
  tierId: number
  userId: number
  points: number
  wins: number
  losses: number
  draws: number
  bestMo3: number
  season: LeagueSeason
  tier: LeagueTier
  user: User
}

export interface LeagueResult {
  id: number
  seasonId: number
  competitionId: number
  week: number
  userId: number
  points: number
}

export interface LeagueTier {
  id: number
  level: number
  name: string
  seasonId: number
  season: LeagueSeason
  players: LeaguePlayer[]
  duels: LeagueDuel[]
  standings: LeagueStanding[]
}

export interface LeagueStanding {
  id: number
  tierId: number
  userId: number
  position: number
  points: number
  createdAt: Date
  updatedAt: Date
  tier: LeagueTier
  user: User
}

export interface LeagueDuel {
  id: number
  competitionId: number
  tierId: number
  user1Id: number
  user2Id: number
  user1Points: number
  user2Points: number
  createdAt: Date
  updatedAt: Date
  competition: Competition
  tier: LeagueTier
  user1?: User
  user2?: User
  user1Result?: Result
  user2Result?: Result
  ended: boolean
}

export interface TierSchedule {
  tier: LeagueTier
  schedules: LeagueDuel[]
}

export interface LeaguePlayer {
  id: number
  seasonId: number
  tierId: number
  userId: number
  season: LeagueSeason
  tier: LeagueTier
  user: User
  standings: LeagueStanding[]
}

export const SYMBOL_LEAGUE_SEASON: InjectionKey<Ref<LeagueSeason>> = Symbol('leagueSeason')

export function leagueWeek(competition: Competition) {
  return competition.alias.split('-')[2]
}

export function leagueWeekPoints(user1Points: number, user2Points: number) {
  if (user1Points + user2Points === 0 || user1Points + user2Points !== 3) {
    return '-'
  }
  if (user1Points > user2Points) {
    return 2
  }
  if (user1Points === user2Points) {
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
  'bg-orange-200',
]

export const unassignedTier = {
  id: 0,
  name: '-',
} satisfies Partial<LeagueTier>
