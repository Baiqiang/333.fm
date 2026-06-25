import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import {
  CompetitionMode,
  Competitions,
  CompetitionStatus,
  CompetitionSubType,
  CompetitionType,
} from '@/entities/competitions.entity'
import { LeagueDuels } from '@/entities/league-duels.entity'
import { DNF, DNS, Results } from '@/entities/results.entity'
import { Scrambles } from '@/entities/scrambles.entity'
import { Submissions } from '@/entities/submissions.entity'
import { PointSource, UserPoints } from '@/entities/user-points.entity'
import { Users } from '@/entities/users.entity'

// ============================================================
// Point Rules Configuration
// ============================================================

export interface WeeklyPointRules {
  /** max(0, baseRankPoint - rank) */
  baseRankPoint: number
  /** averageCoefficient / average */
  averageCoefficient: number
  joinPoints: {
    nonDNF: number
    dnfWithNonDNFSingle: number
    unlimitedNonDNFAverage: number
    unlimitedDNFWithNonDNFSingle: number
  }
  consecutive: {
    pointsPerStreak: number
    maxPoints: number
    /** max gap between two competition start times (ms) */
    intervalMs: number
  }
  bestSingle: {
    regular: number
    unlimited: number
  }
}

export interface DailyPointRules {
  baseRankPoint: number
  /** bestCoefficient / best (BO1) */
  bestCoefficient: number
  joinPoints: {
    nonDNF: number
    dnfWithNonDNFSingle: number
  }
  consecutive: {
    pointsPerStreak: number
    maxPoints: number
    intervalMs: number
  }
  bestSingle: number
}

export interface EndlessPointRules {
  pointPerLevel: number
  pointKickedOff: number
}

export interface LeaguePointRules {
  pointPerWin: number
  pointPerDraw: number
  /** participation point per match played */
  pointPerMatch: number
}

export interface PointRules {
  weekly: WeeklyPointRules
  daily: DailyPointRules
  endless: Partial<Record<CompetitionSubType, EndlessPointRules>>
  league: LeaguePointRules
}

// ============================================================
// Default Rules — tweak numbers here to rebalance scoring
// ============================================================

export const DEFAULT_POINT_RULES: PointRules = {
  weekly: {
    baseRankPoint: 11,
    averageCoefficient: 200,
    joinPoints: {
      nonDNF: 10,
      dnfWithNonDNFSingle: 3,
      unlimitedNonDNFAverage: 3,
      unlimitedDNFWithNonDNFSingle: 1,
    },
    consecutive: {
      pointsPerStreak: 2,
      maxPoints: 10,
      intervalMs: 7 * 24 * 60 * 60 * 1000,
    },
    bestSingle: {
      regular: 10,
      unlimited: 5,
    },
  },
  daily: {
    baseRankPoint: 6,
    bestCoefficient: 100,
    joinPoints: {
      nonDNF: 5,
      dnfWithNonDNFSingle: 1,
    },
    consecutive: {
      pointsPerStreak: 1,
      maxPoints: 7,
      intervalMs: 2 * 24 * 60 * 60 * 1000,
    },
    bestSingle: 3,
  },
  endless: {
    [CompetitionSubType.BOSS_CHALLENGE]: { pointPerLevel: 2, pointKickedOff: 0 },
    [CompetitionSubType.REGULAR]: { pointPerLevel: 0.5, pointKickedOff: 0 },
  },
  league: {
    pointPerWin: 5,
    pointPerDraw: 2,
    pointPerMatch: 1,
  },
}

// ============================================================

interface PointRecord {
  userId: number
  user: Users
  competitionId: number | null
  source: PointSource
  points: number
  pointDetails: Record<string, number>
  earnedAt: Date
}

@Injectable()
export class PointService {
  private readonly logger = new Logger(PointService.name)

  constructor(
    @InjectRepository(Competitions)
    private readonly competitionsRepository: Repository<Competitions>,
    @InjectRepository(Scrambles)
    private readonly scramblesRepository: Repository<Scrambles>,
    @InjectRepository(Submissions)
    private readonly submissionsRepository: Repository<Submissions>,
    @InjectRepository(Results)
    private readonly resultsRepository: Repository<Results>,
    @InjectRepository(Users)
    private readonly usersRepository: Repository<Users>,
    @InjectRepository(LeagueDuels)
    private readonly leagueDuelsRepository: Repository<LeagueDuels>,
    @InjectRepository(UserPoints)
    private readonly userPointsRepository: Repository<UserPoints>,
  ) {}

  async calculate(rules: PointRules = DEFAULT_POINT_RULES): Promise<void> {
    const records: PointRecord[] = []

    this.logger.log('Calculating weekly points...')
    records.push(...(await this.calculateWeekly(rules.weekly)))

    this.logger.log('Calculating daily points...')
    records.push(...(await this.calculateDaily(rules.daily)))

    for (const [subType, endlessRules] of Object.entries(rules.endless)) {
      this.logger.log(`Calculating endless (subType=${subType}) points...`)
      records.push(...(await this.calculateEndless(Number(subType) as CompetitionSubType, endlessRules)))
    }

    this.logger.log('Calculating league points...')
    records.push(...(await this.calculateLeague(rules.league)))

    this.logger.log(`Persisting ${records.length} point records...`)
    await this.userPointsRepository.clear()

    const BATCH_SIZE = 500
    for (let i = 0; i < records.length; i += BATCH_SIZE) {
      const batch = records.slice(i, i + BATCH_SIZE).map(r => {
        const entity = new UserPoints()
        entity.userId = r.userId
        entity.competitionId = r.competitionId
        entity.source = r.source
        entity.points = r.points
        entity.pointDetails = r.pointDetails
        entity.earnedAt = r.earnedAt
        return entity
      })
      await this.userPointsRepository.save(batch)
    }

    this.logger.log('Done. Top 20:')
    const totals = new Map<number, { user: Users; total: number }>()
    for (const r of records) {
      const entry = totals.get(r.userId) || { user: r.user, total: 0 }
      entry.total += r.points
      totals.set(r.userId, entry)
    }
    const sorted = [...totals.values()].sort((a, b) => b.total - a.total).slice(0, 20)
    sorted.forEach(({ user, total }, i) => this.logger.log(`${i + 1}. ${user.name} — ${total.toFixed(2)}`))
  }

  // ── Weekly ──────────────────────────────────────────────────

  private async calculateWeekly(rules: WeeklyPointRules): Promise<PointRecord[]> {
    const weeklies = await this.competitionsRepository.find({
      where: { type: CompetitionType.WEEKLY, status: CompetitionStatus.ENDED },
      order: { startTime: 'ASC' },
    })

    const allRecords: PointRecord[] = []
    const consecutiveUsers: Record<number, { weeks: number; lastWeek: Date }> = {}

    for (const weekly of weeklies) {
      const results = await this.resultsRepository.find({
        where: { competitionId: weekly.id, mode: CompetitionMode.REGULAR },
        order: { rank: 'ASC' },
        relations: { user: true },
      })
      const unlimitedResults = await this.resultsRepository.find({
        where: { competitionId: weekly.id, mode: CompetitionMode.UNLIMITED },
        order: { rank: 'ASC' },
        relations: { user: true },
      })
      const unlimitedResultsMap = Object.fromEntries(unlimitedResults.map(r => [r.user.id, r]))

      const recordsMap: Record<number, PointRecord> = {}
      const bests: Record<number, { best: number; userIds: number[] }> = {}

      for (const result of results) {
        const user = result.user

        const isDNF = result.average === DNF
        const hasNonDNF = result.values.some(v => v !== DNF && v !== DNS)
        const isDNFUnlimited = unlimitedResultsMap[user.id]?.average === DNF
        const hasNonDNFUnlimited = unlimitedResultsMap[user.id]?.values?.some(v => v !== DNF && v !== DNS)

        const rankPoint = Math.max(0, rules.baseRankPoint - result.rank)
        const averagePoint = isDNF ? 0 : rules.averageCoefficient / result.average

        let joinPoint = 0
        if (isDNF) {
          if (hasNonDNF) joinPoint = rules.joinPoints.dnfWithNonDNFSingle
          if (!isDNFUnlimited) {
            joinPoint += rules.joinPoints.unlimitedNonDNFAverage
          } else if (hasNonDNFUnlimited) {
            joinPoint += rules.joinPoints.unlimitedDNFWithNonDNFSingle
          }
        } else {
          joinPoint = rules.joinPoints.nonDNF
        }

        if (hasNonDNF) {
          const consecutive = consecutiveUsers[user.id] || { weeks: 0, lastWeek: new Date(0) }
          if (weekly.startTime.getTime() - consecutive.lastWeek.getTime() <= rules.consecutive.intervalMs) {
            consecutive.weeks++
          } else {
            consecutive.weeks = 0
          }
          consecutive.lastWeek = weekly.startTime
          consecutiveUsers[user.id] = consecutive
        }

        const consecutivePoint = Math.min(
          (consecutiveUsers[user.id]?.weeks || 0) * rules.consecutive.pointsPerStreak,
          rules.consecutive.maxPoints,
        )

        this.trackBestSingles(bests, result.values, user.id)

        recordsMap[user.id] = {
          userId: user.id,
          user,
          competitionId: weekly.id,
          source: PointSource.WEEKLY,
          points: rankPoint + averagePoint + joinPoint + consecutivePoint,
          pointDetails: { rank: rankPoint, average: averagePoint, join: joinPoint, consecutive: consecutivePoint },
          earnedAt: weekly.startTime,
        }
      }

      // regular best singles
      for (const { userIds } of Object.values(bests)) {
        for (const uid of userIds) {
          if (recordsMap[uid]) {
            recordsMap[uid].points += rules.bestSingle.regular
            recordsMap[uid].pointDetails.bestSingle =
              (recordsMap[uid].pointDetails.bestSingle || 0) + rules.bestSingle.regular
          }
        }
      }

      // reset & compute unlimited best singles
      for (const key of Object.keys(bests)) bests[Number(key)] = { best: Infinity, userIds: [] }
      for (const result of unlimitedResults) {
        this.trackBestSingles(bests, result.values, result.user.id)
      }
      for (const { userIds } of Object.values(bests)) {
        for (const uid of userIds) {
          if (recordsMap[uid]) {
            recordsMap[uid].points += rules.bestSingle.unlimited
            recordsMap[uid].pointDetails.bestSingleUnlimited =
              (recordsMap[uid].pointDetails.bestSingleUnlimited || 0) + rules.bestSingle.unlimited
          }
        }
      }

      allRecords.push(...Object.values(recordsMap))
    }

    return allRecords
  }

  // ── Daily ───────────────────────────────────────────────────

  private async calculateDaily(rules: DailyPointRules): Promise<PointRecord[]> {
    const dailies = await this.competitionsRepository.find({
      where: { type: CompetitionType.DAILY, status: CompetitionStatus.ENDED },
      order: { startTime: 'ASC' },
    })

    const allRecords: PointRecord[] = []
    const consecutiveUsers: Record<number, { days: number; lastDay: Date }> = {}

    for (const daily of dailies) {
      const results = await this.resultsRepository.find({
        where: { competitionId: daily.id, mode: CompetitionMode.REGULAR },
        order: { rank: 'ASC' },
        relations: { user: true },
      })

      const recordsMap: Record<number, PointRecord> = {}
      const bests: Record<number, { best: number; userIds: number[] }> = {}

      for (const result of results) {
        const user = result.user
        const isDNF = result.best === DNF
        const hasNonDNF = result.values.some(v => v !== DNF && v !== DNS)

        const rankPoint = Math.max(0, rules.baseRankPoint - result.rank)
        const bestPoint = isDNF ? 0 : rules.bestCoefficient / result.best
        const joinPoint = isDNF ? (hasNonDNF ? rules.joinPoints.dnfWithNonDNFSingle : 0) : rules.joinPoints.nonDNF

        if (hasNonDNF) {
          const consecutive = consecutiveUsers[user.id] || { days: 0, lastDay: new Date(0) }
          if (daily.startTime.getTime() - consecutive.lastDay.getTime() <= rules.consecutive.intervalMs) {
            consecutive.days++
          } else {
            consecutive.days = 0
          }
          consecutive.lastDay = daily.startTime
          consecutiveUsers[user.id] = consecutive
        }

        const consecutivePoint = Math.min(
          (consecutiveUsers[user.id]?.days || 0) * rules.consecutive.pointsPerStreak,
          rules.consecutive.maxPoints,
        )

        this.trackBestSingles(bests, result.values, user.id)

        recordsMap[user.id] = {
          userId: user.id,
          user,
          competitionId: daily.id,
          source: PointSource.DAILY,
          points: rankPoint + bestPoint + joinPoint + consecutivePoint,
          pointDetails: { rank: rankPoint, best: bestPoint, join: joinPoint, consecutive: consecutivePoint },
          earnedAt: daily.startTime,
        }
      }

      for (const { userIds } of Object.values(bests)) {
        for (const uid of userIds) {
          if (recordsMap[uid]) {
            recordsMap[uid].points += rules.bestSingle
            recordsMap[uid].pointDetails.bestSingle = (recordsMap[uid].pointDetails.bestSingle || 0) + rules.bestSingle
          }
        }
      }

      allRecords.push(...Object.values(recordsMap))
    }

    return allRecords
  }

  // ── Endless ─────────────────────────────────────────────────

  private async calculateEndless(subType: CompetitionSubType, rules: EndlessPointRules): Promise<PointRecord[]> {
    const competition = await this.competitionsRepository.findOne({
      where: { type: CompetitionType.ENDLESS, subType },
    })
    if (!competition) return []

    const source =
      subType === CompetitionSubType.BOSS_CHALLENGE ? PointSource.ENDLESS_BOSS : PointSource.ENDLESS_REGULAR

    const scrambles = await this.scramblesRepository.find({
      where: { competitionId: competition.id },
      order: { number: 'ASC' },
      relations: { kickoffs: { user: true } },
    })

    const userMap: Record<number, { user: Users; levels: number; kickoffs: number }> = {}

    for (const scramble of scrambles) {
      const submissions = await this.submissionsRepository.find({
        where: { scrambleId: scramble.id },
        order: { cumulativeMoves: 'ASC', moves: 'ASC' },
        relations: { user: true },
      })
      for (const submission of submissions) {
        const entry = (userMap[submission.user.id] = userMap[submission.user.id] || {
          user: submission.user,
          levels: 0,
          kickoffs: 0,
        })
        entry.levels++
      }
      for (const { user } of scramble.kickoffs) {
        const entry = userMap[user.id]
        if (entry) {
          entry.kickoffs += 1 / scramble.kickoffs.length
        }
      }
    }

    return Object.entries(userMap).map(([uid, { user, levels, kickoffs }]) => ({
      userId: Number(uid),
      user,
      competitionId: competition.id,
      source,
      points: levels * rules.pointPerLevel + kickoffs * rules.pointKickedOff,
      pointDetails: { levels, kickoffs },
      earnedAt: competition.startTime,
    }))
  }

  // ── League ──────────────────────────────────────────────────

  private async calculateLeague(rules: LeaguePointRules): Promise<PointRecord[]> {
    const duels = await this.leagueDuelsRepository.find({
      relations: { user1: true, user2: true },
    })

    const userMap: Record<number, { user: Users; matches: number; wins: number; draws: number }> = {}

    for (const duel of duels) {
      if (!duel.ended) continue

      const ensure = (uid: number, user: Users) =>
        (userMap[uid] = userMap[uid] || { user, matches: 0, wins: 0, draws: 0 })

      const u1 = ensure(duel.user1Id, duel.user1)
      const u2 = ensure(duel.user2Id, duel.user2)

      u1.matches++
      u2.matches++

      if (duel.user1Points > duel.user2Points) {
        u1.wins++
      } else if (duel.user1Points < duel.user2Points) {
        u2.wins++
      } else {
        u1.draws++
        u2.draws++
      }
    }

    return Object.entries(userMap).map(([uid, { user, matches, wins, draws }]) => ({
      userId: Number(uid),
      user,
      competitionId: null,
      source: PointSource.LEAGUE,
      points: matches * rules.pointPerMatch + wins * rules.pointPerWin + draws * rules.pointPerDraw,
      pointDetails: { matches, wins, draws },
      earnedAt: new Date(),
    }))
  }

  // ── Helpers ─────────────────────────────────────────────────

  private trackBestSingles(
    bests: Record<number, { best: number; userIds: number[] }>,
    values: number[],
    userId: number,
  ): void {
    for (let i = 0; i < values.length; i++) {
      if (values[i] === DNF || values[i] === DNS) continue
      const best = bests[i] || { best: Infinity, userIds: [] }
      if (values[i] < best.best) {
        best.best = values[i]
        best.userIds = [userId]
      } else if (values[i] === best.best) {
        best.userIds.push(userId)
      }
      bests[i] = best
    }
  }
}
