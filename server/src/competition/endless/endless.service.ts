import { InjectQueue } from '@nestjs/bull'
import { BadRequestException, forwardRef, Inject, Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectRepository } from '@nestjs/typeorm'
import { Queue } from 'bull'
import { Algorithm } from 'insertionfinder'
import { In, Repository } from 'typeorm'

import { SubmitSolutionDto } from '@/dtos/submit-solution.dto'
import { Challenges, getRandomBossHitPoints, matchesChallengeLevel } from '@/entities/challenges.entity'
import { Competitions, CompetitionStatus, CompetitionSubType, CompetitionType } from '@/entities/competitions.entity'
import {
  AllDifferentMovesParams,
  ConditionParams,
  ConditionType,
  ConsecutiveMovesParams,
  EndlessChallengeConditions,
  MovesEqualParams,
  MovesGeParams,
  MovesLeParams,
  MovesParityParams,
  ParityType,
  SameMovesParams,
  SameSolutionParams,
  TotalSubmissionsParams,
} from '@/entities/endless-challenge-conditions.entity'
import { EndlessKickoffs } from '@/entities/endless-kickoffs.entity'
import { DNF, Results } from '@/entities/results.entity'
import { Scrambles } from '@/entities/scrambles.entity'
import { Submissions } from '@/entities/submissions.entity'
import { Users } from '@/entities/users.entity'
import {
  calculateMoves,
  calculateTrimmedMean,
  getCubieCube,
  getTopDistinctN,
  getTopN,
  replaceQuote,
  sortResult,
} from '@/utils'
import { generateScramble, ScrambleType } from '@/utils/scramble'

import { CompetitionService } from '../competition.service'

export interface UserProgress {
  current: Progress | null
  next: Progress
}

export interface Progress {
  level: number
  scramble: Scrambles
  submission?: Submissions
  kickedBy?: EndlessKickoffs[]
  dnfPenalty?: boolean
  conditions?: LevelConditionInfo[]
}

export interface EndlessJob {
  competitionId: number
  userId: number
  scrambleId: number
  scrambleNumber: number
  submissionId: number
  moves: number
  previousLevelDnfPenalty: boolean
  solution?: string
}

export interface UserLevel {
  level: number
  rank: number
  userId: number
  user: Users
}

export interface UserBest extends UserLevel {
  best: number
}

export interface LevelConditionInfo {
  id: number
  type: ConditionType
  revealed: boolean
  autoRevealed: boolean
  revealedAt: string | null
  triggeredByUser: Users | null
  contributors?: { userId: number; submissionId: number }[]
  description?: string
  params?: ConditionParams
}

// --- condition generation helpers ---

export function isBossLevel(level: number): boolean {
  return level % 10 === 0
}

export function normalizeSolution(solution: string): string {
  const alg = new Algorithm(replaceQuote(solution))
  alg.normalize()
  alg.cancelMoves()
  const twists = [...alg.twists].sort((a, b) => a - b)
  return twists.join(',')
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randBetween(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1))
}

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

export type ConditionDef = { type: ConditionType; params: ConditionParams }

const MULTI_PERSON_TYPES = new Set([
  ConditionType.SAME_SOLUTION,
  ConditionType.SAME_MOVES,
  ConditionType.ALL_DIFFERENT_MOVES,
  ConditionType.TOTAL_SUBMISSIONS,
  ConditionType.CONSECUTIVE_MOVES,
])

// ── tier config ──
// tier = floor((level-1) / 10), capped at 6
//
// EQ/LE/GE move targets are constant: 22-26 (boss LE/EQ: 21-24)
// Difficulty scales via condition count, multi-person limits, parity pool,
// multi-person param sizes, and EQ/LE/GE count (N people required).

interface TierConfig {
  regular: { count: [number, number]; maxMulti: number }
  boss: { count: [number, number]; maxMulti: number }
  parities: ParityType[]
  movesPersonCount: number[]
  bossMovesPersonCount: number[]
  totalSubmissions: number[]
  bossTotalSubmissions: number[]
  consecCount: number[]
  bossConsecCount: number[]
}

const EASY_PARITIES = [ParityType.EVEN, ParityType.ODD]
const MID_PARITIES = [ParityType.EVEN, ParityType.ODD, ParityType.MULTIPLE_OF_3]
const HARD_PARITIES = [
  ParityType.EVEN,
  ParityType.ODD,
  ParityType.MULTIPLE_OF_3,
  ParityType.MULTIPLE_OF_5,
  ParityType.MULTIPLE_OF_7,
]

const EQ_TARGETS = [2200, 2300, 2400, 2500, 2600]
const LE_TARGETS = [2200, 2300, 2400, 2500, 2600]
const GE_TARGETS = [2200, 2300, 2400, 2500, 2600]
const BOSS_EQ_TARGETS = [2100, 2200, 2300, 2400]
const BOSS_LE_TARGETS = [2100, 2200, 2300, 2400]

const TIER_CONFIGS: TierConfig[] = [
  // T0: LV 1-9 / 10
  {
    regular: { count: [1, 1], maxMulti: 1 },
    boss: { count: [2, 3], maxMulti: 1 },
    parities: EASY_PARITIES,
    movesPersonCount: [1],
    bossMovesPersonCount: [1],
    totalSubmissions: [3],
    bossTotalSubmissions: [3],
    consecCount: [3],
    bossConsecCount: [3],
  },
  // T1: LV 11-19 / 20
  {
    regular: { count: [1, 2], maxMulti: 1 },
    boss: { count: [2, 3], maxMulti: 2 },
    parities: EASY_PARITIES,
    movesPersonCount: [1],
    bossMovesPersonCount: [1, 2],
    totalSubmissions: [3],
    bossTotalSubmissions: [3, 4],
    consecCount: [3],
    bossConsecCount: [3],
  },
  // T2: LV 21-29 / 30
  {
    regular: { count: [1, 2], maxMulti: 1 },
    boss: { count: [3, 4], maxMulti: 2 },
    parities: MID_PARITIES,
    movesPersonCount: [1, 2],
    bossMovesPersonCount: [1, 2],
    totalSubmissions: [3],
    bossTotalSubmissions: [3, 4, 5],
    consecCount: [3],
    bossConsecCount: [3, 4],
  },
  // T3: LV 31-39 / 40
  {
    regular: { count: [2, 2], maxMulti: 1 },
    boss: { count: [3, 4], maxMulti: 2 },
    parities: MID_PARITIES,
    movesPersonCount: [1, 2],
    bossMovesPersonCount: [1, 2, 3],
    totalSubmissions: [3],
    bossTotalSubmissions: [4, 5],
    consecCount: [3],
    bossConsecCount: [3, 4],
  },
  // T4: LV 41-49 / 50
  {
    regular: { count: [2, 2], maxMulti: 1 },
    boss: { count: [3, 5], maxMulti: 4 },
    parities: HARD_PARITIES,
    movesPersonCount: [1, 2],
    bossMovesPersonCount: [2, 3],
    totalSubmissions: [3],
    bossTotalSubmissions: [4, 5],
    consecCount: [3],
    bossConsecCount: [3, 4, 5],
  },
  // T5: LV 51-59 / 60
  {
    regular: { count: [2, 3], maxMulti: 1 },
    boss: { count: [4, 5], maxMulti: 4 },
    parities: HARD_PARITIES,
    movesPersonCount: [1, 2, 3],
    bossMovesPersonCount: [2, 3],
    totalSubmissions: [3],
    bossTotalSubmissions: [4, 5],
    consecCount: [3],
    bossConsecCount: [3, 4, 5],
  },
  // T6+: LV 61+ / 70+
  {
    regular: { count: [2, 3], maxMulti: 2 },
    boss: { count: [4, 5], maxMulti: 4 },
    parities: HARD_PARITIES,
    movesPersonCount: [2, 3],
    bossMovesPersonCount: [2, 3],
    totalSubmissions: [3],
    bossTotalSubmissions: [5],
    consecCount: [3],
    bossConsecCount: [4, 5],
  },
]

function getTierConfig(level: number): TierConfig {
  const tier = Math.min(Math.floor((level - 1) / 10), TIER_CONFIGS.length - 1)
  return TIER_CONFIGS[tier]
}

function buildConditionPool(level: number): ConditionDef[] {
  const boss = isBossLevel(level)
  const cfg = getTierConfig(level)

  const eqTargets = boss ? BOSS_EQ_TARGETS : EQ_TARGETS
  const leTargets = boss ? BOSS_LE_TARGETS : LE_TARGETS
  const geTargets = GE_TARGETS
  const personCounts = boss ? cfg.bossMovesPersonCount : cfg.movesPersonCount
  const totalCounts = boss ? cfg.bossTotalSubmissions : cfg.totalSubmissions
  const consecCounts = boss ? cfg.bossConsecCount : cfg.consecCount
  const consecN = pickRandom(consecCounts)
  const consecDiff = pickRandom(consecN === 3 ? [100, 200, 300] : [100, 200])

  const eqCount = pickRandom(personCounts)
  const leCount = pickRandom(personCounts)
  const geCount = pickRandom(personCounts)

  return [
    { type: ConditionType.MOVES_EQUAL, params: { moves: pickRandom(eqTargets), count: eqCount } as MovesEqualParams },
    {
      type: ConditionType.MOVES_EQUAL,
      params: { moves: pickRandom(eqTargets), count: pickRandom(personCounts) } as MovesEqualParams,
    },
    { type: ConditionType.MOVES_LE, params: { moves: pickRandom(leTargets), count: leCount } as MovesLeParams },
    { type: ConditionType.MOVES_GE, params: { moves: pickRandom(geTargets), count: geCount } as MovesGeParams },
    { type: ConditionType.MOVES_PARITY, params: { parity: pickRandom(cfg.parities) } as MovesParityParams },
    { type: ConditionType.SAME_SOLUTION, params: { count: 2 } as SameSolutionParams },
    { type: ConditionType.SAME_MOVES, params: { count: boss ? pickRandom([2, 3]) : 2 } as SameMovesParams },
    { type: ConditionType.ALL_DIFFERENT_MOVES, params: { minSubmissions: 3 } as AllDifferentMovesParams },
    { type: ConditionType.TOTAL_SUBMISSIONS, params: { count: pickRandom(totalCounts) } as TotalSubmissionsParams },
    { type: ConditionType.CONSECUTIVE_MOVES, params: { count: consecN, diff: consecDiff } as ConsecutiveMovesParams },
  ]
}

function getMovesValue(item: ConditionDef): number {
  return (item.params as MovesEqualParams | MovesLeParams | MovesGeParams).moves
}

function hasMovesConflict(candidate: ConditionDef, selected: ConditionDef[]): boolean {
  const v = getMovesValue(candidate)
  for (const s of selected) {
    if (s.type !== ConditionType.MOVES_EQUAL && s.type !== ConditionType.MOVES_LE && s.type !== ConditionType.MOVES_GE)
      continue
    const sv = getMovesValue(s)
    switch (candidate.type) {
      case ConditionType.MOVES_LE:
        if (s.type === ConditionType.MOVES_GE && v >= sv) return true
        if (s.type === ConditionType.MOVES_EQUAL && sv <= v) return true
        break
      case ConditionType.MOVES_GE:
        if (s.type === ConditionType.MOVES_LE && sv >= v) return true
        if (s.type === ConditionType.MOVES_EQUAL && sv >= v) return true
        break
      case ConditionType.MOVES_EQUAL:
        if (s.type === ConditionType.MOVES_LE && v <= sv) return true
        if (s.type === ConditionType.MOVES_GE && v >= sv) return true
        if (s.type === ConditionType.MOVES_EQUAL && v === sv) return true
        break
    }
  }
  return false
}

function isMultiPerson(item: ConditionDef): boolean {
  if (MULTI_PERSON_TYPES.has(item.type)) return true
  const movesTypes = [ConditionType.MOVES_EQUAL, ConditionType.MOVES_LE, ConditionType.MOVES_GE]
  if (movesTypes.includes(item.type)) {
    const c = (item.params as MovesEqualParams | MovesLeParams | MovesGeParams).count
    return c !== undefined && c > 1
  }
  return false
}

export function generateConditions(level: number, blockUsedTypes?: Set<ConditionType>): ConditionDef[] {
  const boss = isBossLevel(level)
  const cfg = getTierConfig(level)
  const tier = boss ? cfg.boss : cfg.regular
  const count = randBetween(tier.count[0], tier.count[1])
  const pool = shuffle(buildConditionPool(level))

  // for regular levels, prefer types not yet used in the current 10-level block
  if (!boss && blockUsedTypes && blockUsedTypes.size > 0) {
    const allTypes = new Set(pool.map(p => p.type))
    const hasUnused = [...allTypes].some(t => !blockUsedTypes.has(t))
    if (hasUnused) {
      pool.sort((a, b) => {
        const aUsed = blockUsedTypes.has(a.type) ? 1 : 0
        const bUsed = blockUsedTypes.has(b.type) ? 1 : 0
        return aUsed - bUsed
      })
    }
  }

  const selected: ConditionDef[] = []
  const usedTypes = new Set<ConditionType>()
  let multiPersonCount = 0
  for (const item of pool) {
    if (item.type !== ConditionType.MOVES_EQUAL && usedTypes.has(item.type)) continue
    const isMovesType =
      item.type === ConditionType.MOVES_EQUAL ||
      item.type === ConditionType.MOVES_LE ||
      item.type === ConditionType.MOVES_GE
    if (isMovesType && hasMovesConflict(item, selected)) continue
    const multi = isMultiPerson(item)
    if (multi && multiPersonCount >= tier.maxMulti) continue
    if (multi) multiPersonCount++
    usedTypes.add(item.type)
    selected.push(item)
    if (selected.length >= count) break
  }
  return selected
}

@Injectable()
export class EndlessService {
  private readonly logger = new Logger(EndlessService.name)

  constructor(
    @InjectRepository(Scrambles)
    private readonly scramblesRepository: Repository<Scrambles>,
    @InjectRepository(Submissions)
    private readonly submissionsRepository: Repository<Submissions>,
    @InjectRepository(Results)
    private readonly resultsRepository: Repository<Results>,
    @InjectRepository(Challenges)
    private readonly challengesRepository: Repository<Challenges>,
    @InjectRepository(EndlessChallengeConditions)
    private readonly conditionsRepository: Repository<EndlessChallengeConditions>,
    @InjectRepository(EndlessKickoffs)
    private readonly kickoffsRepository: Repository<EndlessKickoffs>,
    @Inject(forwardRef(() => CompetitionService))
    private readonly competitionService: CompetitionService,
    @InjectQueue('endless')
    private readonly queue: Queue<EndlessJob>,
    private readonly configService: ConfigService,
  ) {}

  private isMystery(competition: Competitions) {
    return competition.subType === CompetitionSubType.MYSTERY
  }

  async start(competition: Competitions) {
    const scramble = new Scrambles()
    scramble.competition = competition
    scramble.number = 1
    switch (competition.subType) {
      case CompetitionSubType.EO_PRACTICE:
        scramble.scramble = generateScramble(ScrambleType.EO)
        break
      case CompetitionSubType.DR_PRACTICE:
        scramble.scramble = generateScramble(ScrambleType.DR)
        break
      case CompetitionSubType.HTR_PRACTICE:
        scramble.scramble = generateScramble(ScrambleType.HTR)
        break
      case CompetitionSubType.JZP_PRACTICE:
        scramble.scramble = generateScramble(ScrambleType.JZP)
        break
      default:
        scramble.scramble = generateScramble()
        break
    }
    if (!this.isMystery(competition)) {
      const challenges = await this.challengesRepository.find({
        where: { competitionId: competition.id },
        order: { id: 'ASC' },
      })
      const challenge = challenges.find(entry => matchesChallengeLevel(entry, 1))
      if (challenge?.isBoss) {
        scramble.initialHP = getRandomBossHitPoints(challenge.bossChallenge)
        scramble.currentHP = scramble.initialHP
      }
    }
    await this.scramblesRepository.save(scramble)
    if (this.isMystery(competition)) {
      await this.generateConditionsForLevel(competition.id, scramble)
    }
  }

  async getLatest() {
    const competition = await this.competitionService.findOne({
      where: { type: CompetitionType.ENDLESS },
      order: { id: 'DESC' },
    })
    if (competition === null) {
      return null
    }
    await this.fetchLevelInfo(competition)
    return competition
  }

  async getOnGoing(subType?: CompetitionSubType) {
    const competitions = await this.competitionService.findMany({
      where: { type: CompetitionType.ENDLESS, subType, status: CompetitionStatus.ON_GOING },
      order: { startTime: 'DESC' },
    })
    return competitions
  }

  async getEnded(subType?: CompetitionSubType) {
    const competitions = await this.competitionService.findMany({
      where: { type: CompetitionType.ENDLESS, subType, status: CompetitionStatus.ENDED },
      order: { startTime: 'DESC' },
    })
    return competitions
  }

  async getBySeason(season: string) {
    const competition = await this.competitionService.findOne({
      where: { type: CompetitionType.ENDLESS, alias: season },
    })
    if (competition === null) {
      return null
    }
    await this.fetchLevelInfo(competition)
    return competition
  }

  async fetchLevelInfo(competition: Competitions) {
    const levels = await this.scramblesRepository.find({
      where: { competitionId: competition.id },
      order: { number: 'DESC' },
      relations: { kickoffs: { user: true, submission: true } },
    })

    let conditionsByScramble: Map<number, EndlessChallengeConditions[]> | null = null
    if (this.isMystery(competition)) {
      const allConditions = await this.conditionsRepository.find({
        where: { competitionId: competition.id },
        relations: { triggeredByUser: true },
        order: { id: 'ASC' },
      })
      conditionsByScramble = new Map()
      for (const c of allConditions) {
        const arr = conditionsByScramble.get(c.scrambleId) || []
        arr.push(c)
        conditionsByScramble.set(c.scrambleId, arr)
      }
    }

    competition.levels = await Promise.all(
      levels.map(async level => {
        const competitors = await this.submissionsRepository.count({
          where: { scrambleId: level.id },
        })
        const bestSubmission = await this.submissionsRepository.findOne({
          where: { scrambleId: level.id },
          order: { moves: 'ASC' },
          relations: { user: true },
        })
        let bestSubmissions: Submissions[] = []
        if (bestSubmission) {
          bestSubmissions = await this.submissionsRepository.find({
            where: { scrambleId: level.id, moves: bestSubmission.moves },
            relations: { user: true },
          })
          bestSubmissions.forEach(s => s.removeSolution())
        }
        const result: any = {
          level: level.number,
          competitors,
          bestSubmissions,
          kickedOffs: level.kickoffs.map(k => {
            k.removeSolution()
            return k
          }),
        }
        if (conditionsByScramble) {
          const conditions = conditionsByScramble.get(level.id) || []
          result.conditions = conditions.map(c => this.toConditionInfo(c))
        }
        return result
      }),
    )
    if (!this.isMystery(competition)) {
      competition.challenges = await this.challengesRepository.find({
        where: { competitionId: competition.id },
        order: { id: 'ASC' },
      })
    }
  }

  handleScramble(scramble: Scrambles, competition: Competitions) {
    if (!scramble) {
      return
    }
    if (competition.subType === CompetitionSubType.HIDDEN_SCRAMBLE) {
      scramble.cubieCube = getCubieCube(scramble.scramble)
      scramble.removeScramble()
    }
  }

  async getStats(competition: Competitions) {
    const submissions = await this.submissionsRepository.find({
      where: { competitionId: competition.id },
      order: { moves: 'ASC' },
      relations: { user: true, scramble: true },
    })
    const singles: UserBest[] = []
    const singlesMap: Record<number, boolean> = {}
    const submissionsMap: Record<number, UserLevel> = {}
    for (const submission of submissions) {
      if (!singlesMap[submission.userId]) {
        singlesMap[submission.userId] = true
        submissionsMap[submission.userId] = {
          userId: submission.userId,
          user: submission.user,
          level: 0,
          rank: 0,
        }
        singles.push({
          userId: submission.userId,
          user: submission.user,
          level: submission.scramble.number,
          rank: 0,
          best: submission.moves,
        })
      }
      submissionsMap[submission.userId].level++
    }
    const results = await this.resultsRepository.find({
      where: { competitionId: competition.id },
      order: { average: 'ASC', best: 'ASC' },
      relations: { user: true },
    })
    const allRollingMo3: Results[] = []
    const allRollingAo5: Results[] = []
    const allRollingAo12: Results[] = []
    for (const result of results) {
      const length = result.values.length
      if (length < 3) {
        continue
      }
      for (let i = 0; i < length - 2; i++) {
        allRollingMo3.push(result.cloneRolling(i, 3, true))
        if (length >= 5 && i < length - 4) {
          allRollingAo5.push(result.cloneRolling(i, 5))
          if (length >= 12 && i < length - 11) {
            allRollingAo12.push(result.cloneRolling(i, 12))
          }
        }
      }
    }
    allRollingMo3.sort(sortResult)
    allRollingAo5.sort(sortResult)
    allRollingAo12.sort(sortResult)

    const stats: any = {
      highestLevels: getTopDistinctN(submissionsMap, 10, ['level'], true),
      singles: getTopN(singles, 10, ['best']),
      means: getTopN(
        results.filter(r => r.values.filter(v => v > 0 && v !== DNF).length >= 3 && r.average !== DNF),
        10,
      ),
      rollingMo3: getTopDistinctN(allRollingMo3, 10),
      rollingAo5: getTopDistinctN(allRollingAo5, 10),
      rollingAo12: getTopDistinctN(allRollingAo12, 10),
    }

    if (this.isMystery(competition)) {
      stats.triggerCounts = await this.getTriggerCountStats(competition.id)
    }

    return stats
  }

  async getProgress(competition: Competitions, user: Users): Promise<UserProgress> {
    const latestSubmission = await this.submissionsRepository.findOne({
      where: { competitionId: competition.id, userId: user.id },
      order: { id: 'DESC' },
      relations: { scramble: true },
    })
    if (!latestSubmission) {
      const nextScramble = await this.scramblesRepository.findOne({
        where: { competitionId: competition.id, number: 1 },
      })
      this.handleScramble(nextScramble, competition)
      return {
        current: null,
        next: { level: 1, scramble: nextScramble },
      }
    }
    const nextScramble = await this.scramblesRepository.findOne({
      where: { competitionId: competition.id, number: latestSubmission.scramble.number + 1 },
    })
    this.handleScramble(nextScramble, competition)
    return {
      current: {
        level: latestSubmission.scramble.number,
        scramble: latestSubmission.scramble,
        submission: latestSubmission,
        dnfPenalty: false,
      },
      next: {
        level: latestSubmission.scramble.number + 1,
        scramble: nextScramble,
        dnfPenalty: competition.subType === CompetitionSubType.BOSS_CHALLENGE && latestSubmission.moves === DNF,
      },
    }
  }

  async getUserStats(competition: Competitions, user: Users) {
    const submissions = await this.submissionsRepository.find({
      where: { competitionId: competition.id, userId: user.id },
      order: { createdAt: 'ASC' },
    })
    const result: any = { submissions }
    if (this.isMystery(competition)) {
      result.triggeredCount = await this.conditionsRepository.count({
        where: { competitionId: competition.id, triggeredByUserId: user.id },
      })
    }
    return result
  }

  async getLevel(competition: Competitions, user: Users, level: number): Promise<Progress> {
    if (!user && level > 1) {
      throw new BadRequestException('Invalid level')
    }
    const scramble = await this.scramblesRepository.findOne({
      where: { competitionId: competition.id, number: level },
      relations: { kickoffs: { user: true, submission: true } },
    })
    if (scramble === null) {
      throw new BadRequestException('Invalid level')
    }
    let dnfPenalty = false
    if (level > 1) {
      const prevSubmission = await this.submissionsRepository.findOne({
        where: { competitionId: competition.id, userId: user.id, scramble: { number: scramble.number - 1 } },
      })
      if (prevSubmission === null) {
        throw new BadRequestException('Previous scramble not solved')
      }
      dnfPenalty = competition.subType === CompetitionSubType.BOSS_CHALLENGE && prevSubmission.moves === DNF
    }
    let submission: Submissions = null
    if (user) {
      submission = await this.submissionsRepository.findOne({
        where: { userId: user.id, scrambleId: scramble.id },
      })
    }
    const canViewKickoffMoves = submission !== null
    const kickedBy = scramble.kickoffs.map(k => {
      if (!canViewKickoffMoves) {
        k.removeSolution()
      } else if (k.submission) {
        k.submission.solution = ''
        k.submission.comment = ''
      }
      return k
    })
    delete scramble.kickoffs
    this.handleScramble(scramble, competition)

    const result: Progress = { level, scramble, submission, kickedBy, dnfPenalty }

    if (this.isMystery(competition)) {
      const conditions = await this.conditionsRepository.find({
        where: { scrambleId: scramble.id },
        relations: { triggeredByUser: true },
        order: { id: 'ASC' },
      })
      result.conditions = conditions.map(c => this.toConditionInfo(c))
    }

    return result
  }

  async getLevelSubmissions(competition: Competitions, user: Users, level: number): Promise<Submissions[]> {
    const scramble = await this.scramblesRepository.findOne({
      where: { competitionId: competition.id, number: level },
    })
    if (scramble === null) {
      throw new BadRequestException('Invalid level')
    }
    if (level > 1) {
      const prevSubmission = await this.submissionsRepository.findOne({
        where: { scramble: { number: scramble.number - 1 }, userId: user.id },
      })
      if (prevSubmission === null) {
        throw new BadRequestException('Previous scramble not solved')
      }
    }
    const qb = this.submissionsRepository
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.user', 'u')
      .leftJoinAndSelect('s.attachments', 'a')
    const submissions = await Submissions.withActivityCounts(qb)
      .where('s.scramble_id = :id', { id: scramble.id })
      .orderBy('s.moves', 'ASC')
      .getMany()
    return submissions
  }

  async submitSolution(competition: Competitions, user: Users, solution: SubmitSolutionDto) {
    const tx = await this.submissionsRepository.manager.transaction(async manager => {
      const scramble = await manager.findOne(Scrambles, {
        where: { id: solution.scrambleId, competitionId: competition.id },
        lock: { mode: 'pessimistic_write' },
      })
      if (scramble === null) {
        throw new BadRequestException('Invalid scramble')
      }
      let previousLevelDnfPenalty = false
      if (scramble.number > 1) {
        const prevScramble = await manager.findOne(Scrambles, {
          where: { competitionId: competition.id, number: scramble.number - 1 },
        })
        const previousLevelSubmission = await manager.findOne(Submissions, {
          where: { scrambleId: prevScramble.id, userId: user.id },
        })
        if (previousLevelSubmission === null) {
          throw new BadRequestException('Previous scramble not solved')
        }
        previousLevelDnfPenalty =
          competition.subType === CompetitionSubType.BOSS_CHALLENGE && previousLevelSubmission.moves === DNF
      }
      const prevSubmission = await manager.findOne(Submissions, {
        where: { scrambleId: scramble.id, userId: user.id },
      })
      if (prevSubmission !== null) {
        throw new BadRequestException('Already submitted')
      }
      const competitionChallenges = await this.challengesRepository.find({
        where: { competitionId: competition.id },
        order: { id: 'ASC' },
      })
      const currentChallenge = competitionChallenges.find(entry => matchesChallengeLevel(entry, scramble.number))
      const moves = calculateMoves(scramble.scramble, solution.solution)
      if (moves === DNF && !this.isMystery(competition) && currentChallenge?.isBoss !== true) {
        throw new BadRequestException('DNF')
      }
      const submission = await this.competitionService.createSubmission(competition, scramble, user, solution, {
        moves,
      })
      let result = await manager.findOne(Results, {
        where: { competitionId: competition.id, userId: user.id },
      })
      if (result === null) {
        result = new Results()
        result.mode = submission.mode
        result.competition = competition
        result.user = user
        result.values = []
        result.best = 0
        result.average = 0
        await manager.save(result)
      }
      submission.result = result
      await manager.save(submission)
      result.values.push(submission.moves)
      result.best = Math.min(...result.values)
      result.average = calculateTrimmedMean(result.values)
      await manager.save(result)
      return { submission, scramble, moves, previousLevelDnfPenalty }
    })
    await this.queue.add({
      competitionId: competition.id,
      userId: user.id,
      scrambleId: tx.scramble.id,
      scrambleNumber: tx.scramble.number,
      submissionId: tx.submission.id,
      moves: tx.moves,
      previousLevelDnfPenalty: tx.previousLevelDnfPenalty,
      solution: solution.solution,
    })
    return tx.submission
  }

  async update(
    competition: Competitions,
    user: Users,
    id: number,
    solution: Pick<SubmitSolutionDto, 'comment' | 'mode' | 'attachments'>,
  ) {
    return await this.competitionService.updateUserSubmission(competition, user, id, solution)
  }

  // --- Condition logic for MYSTERY mode ---

  async generateConditionsForLevel(competitionId: number, scramble: Scrambles) {
    // query used condition types in the current 10-level block (regular levels only)
    let blockUsedTypes: Set<ConditionType> | undefined
    if (!isBossLevel(scramble.number)) {
      const blockStart = Math.floor((scramble.number - 1) / 10) * 10 + 1
      const blockScrambles = await this.scramblesRepository.find({
        where: { competitionId },
      })
      const blockScrambleIds = blockScrambles
        .filter(s => s.number >= blockStart && s.number < scramble.number && !isBossLevel(s.number))
        .map(s => s.id)
      if (blockScrambleIds.length > 0) {
        const existing = await this.conditionsRepository.find({
          where: { competitionId, scrambleId: In(blockScrambleIds) },
          select: ['type'],
        })
        blockUsedTypes = new Set(existing.map(c => c.type))
      }
    }
    const conditions = generateConditions(scramble.number, blockUsedTypes)
    const entities = conditions.map(c => {
      const entity = new EndlessChallengeConditions()
      entity.competitionId = competitionId
      entity.scrambleId = scramble.id
      entity.type = c.type
      entity.params = c.params
      return entity
    })
    await this.conditionsRepository.save(entities)
    return entities
  }

  toConditionInfo(c: EndlessChallengeConditions): LevelConditionInfo {
    const info: LevelConditionInfo = {
      id: c.id,
      type: c.type,
      revealed: c.revealed,
      autoRevealed: c.autoRevealed,
      revealedAt: c.revealedAt?.toISOString() ?? null,
      triggeredByUser: c.revealed ? c.triggeredByUser : null,
    }
    if (c.revealed && !c.autoRevealed) {
      info.params = c.params
      info.contributors = c.contributors ?? []
    }
    return info
  }

  async evaluateConditions(
    competitionId: number,
    userId: number,
    scrambleId: number,
    scrambleNumber: number,
    submissionId: number,
    moves: number,
    solution: string,
  ) {
    if (moves === DNF) return

    const conditions = await this.conditionsRepository.find({
      where: { scrambleId, revealed: false },
      order: { id: 'ASC' },
    })
    if (conditions.length === 0) return

    const allSubmissions = await this.submissionsRepository.find({
      where: { scrambleId },
    })

    this.logger.log(
      `Evaluating ${conditions.length} conditions for level ${scrambleNumber}, ${allSubmissions.length} submissions, current moves=${moves}`,
    )

    let anyTriggered = false
    for (const condition of conditions) {
      const contributors = this.checkCondition(condition, moves, solution, allSubmissions)
      this.logger.log(
        `  Condition ${condition.id} (${condition.type}) params=${JSON.stringify(condition.params)} => ${contributors !== null}`,
      )
      if (contributors) {
        condition.revealed = true
        condition.triggeredByUserId = userId
        condition.triggeredBySubmissionId = submissionId
        condition.contributors = contributors.map(s => ({ userId: s.userId, submissionId: s.id }))
        condition.revealedAt = new Date()
        await this.conditionsRepository.save(condition)
        anyTriggered = true
        this.logger.log(
          `Condition ${condition.id} (${condition.type}) triggered on level ${scrambleNumber}, contributors: ${condition.contributors.map(c => c.userId).join(',')}`,
        )
      }
    }

    if (!anyTriggered) return

    const remaining = await this.conditionsRepository.count({
      where: { scrambleId, revealed: false },
    })
    if (remaining > 0) return

    await this.generateNextChallengeLevel(competitionId, scrambleId, scrambleNumber)
  }

  private checkCondition(
    condition: EndlessChallengeConditions,
    currentMoves: number,
    currentSolution: string,
    allSubmissions: Submissions[],
  ): Submissions[] | null {
    const valid = allSubmissions.filter(s => s.moves > 0 && s.moves !== DNF)
    switch (condition.type) {
      case ConditionType.MOVES_EQUAL: {
        const { moves: target, count: n = 1 } = condition.params as MovesEqualParams
        const matched = valid.filter(s => s.moves === target)
        return matched.length >= n ? matched : null
      }
      case ConditionType.MOVES_LE: {
        const { moves: target, count: n = 1 } = condition.params as MovesLeParams
        const matched = valid.filter(s => s.moves <= target)
        return matched.length >= n ? matched : null
      }
      case ConditionType.MOVES_GE: {
        const { moves: target, count: n = 1 } = condition.params as MovesGeParams
        const matched = valid.filter(s => s.moves >= target)
        return matched.length >= n ? matched : null
      }
      case ConditionType.MOVES_PARITY: {
        const { parity } = condition.params as MovesParityParams
        let check: (m: number) => boolean
        switch (parity) {
          case ParityType.EVEN:
            check = m => m % 2 === 0
            break
          case ParityType.ODD:
            check = m => m % 2 === 1
            break
          case ParityType.MULTIPLE_OF_3:
            check = m => m % 3 === 0
            break
          case ParityType.MULTIPLE_OF_5:
            check = m => m % 5 === 0
            break
          case ParityType.MULTIPLE_OF_7:
            check = m => m % 7 === 0
            break
          default:
            return null
        }
        const matched = valid.filter(s => check(Math.floor(s.moves / 100)))
        return matched.length > 0 ? matched : null
      }
      case ConditionType.SAME_SOLUTION: {
        const { count } = condition.params as SameSolutionParams
        const key = normalizeSolution(currentSolution)
        const matched = valid.filter(s => normalizeSolution(s.solution) === key)
        return matched.length >= count ? matched : null
      }
      case ConditionType.SAME_MOVES: {
        const { count } = condition.params as SameMovesParams
        const matched = valid.filter(s => s.moves === currentMoves)
        return matched.length >= count ? matched : null
      }
      case ConditionType.ALL_DIFFERENT_MOVES: {
        const { minSubmissions } = condition.params as AllDifferentMovesParams
        const seen = new Map(valid.map(s => [s.moves, s] as const))
        return seen.size >= minSubmissions ? [...seen.values()] : null
      }
      case ConditionType.TOTAL_SUBMISSIONS: {
        const { count } = condition.params as TotalSubmissionsParams
        return valid.length >= count ? valid : null
      }
      case ConditionType.CONSECUTIVE_MOVES: {
        const { count: n, diff } = condition.params as ConsecutiveMovesParams
        if (valid.length < n) return null
        const byMoves = new Map(valid.map(s => [s.moves, s] as const))
        const sorted = [...byMoves.keys()].sort((a, b) => a - b)
        for (let i = 0; i <= sorted.length - n; i++) {
          let ok = true
          for (let j = 1; j < n; j++) {
            if (sorted[i + j] - sorted[i + j - 1] !== diff) {
              ok = false
              break
            }
          }
          if (ok) {
            return sorted.slice(i, i + n).map(m => byMoves.get(m)!)
          }
        }
        return null
      }
    }
    return null
  }

  private async generateNextChallengeLevel(competitionId: number, scrambleId: number, scrambleNumber: number) {
    const next = await this.scramblesRepository.findOne({
      where: { competitionId, number: scrambleNumber + 1 },
    })
    if (next) return

    const scramble = new Scrambles()
    scramble.competitionId = competitionId
    scramble.number = scrambleNumber + 1
    scramble.scramble = generateScramble()
    await this.scramblesRepository.save(scramble)
    await this.generateConditionsForLevel(competitionId, scramble)

    const triggeredConditions = await this.conditionsRepository.find({
      where: { scrambleId, revealed: true, autoRevealed: false },
    })
    const kickoffUserIds = new Set<number>()
    const kickoffs: EndlessKickoffs[] = []
    for (const c of triggeredConditions) {
      if (c.triggeredByUserId && !kickoffUserIds.has(c.triggeredByUserId)) {
        kickoffUserIds.add(c.triggeredByUserId)
        const kickoff = new EndlessKickoffs()
        kickoff.competitionId = competitionId
        kickoff.scrambleId = scrambleId
        kickoff.userId = c.triggeredByUserId
        kickoff.submissionId = c.triggeredBySubmissionId!
        kickoffs.push(kickoff)
      }
    }
    if (kickoffs.length > 0) {
      await this.kickoffsRepository.save(kickoffs)
    }
    this.logger.log(`Generated challenge level ${scrambleNumber + 1} for competition ${competitionId}`)
  }

  async autoRevealConditions() {
    const threeDaysAgo = new Date()
    // threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)
    threeDaysAgo.setHours(threeDaysAgo.getHours() - 1)

    const competitions = await this.competitionService.findMany({
      where: {
        type: CompetitionType.ENDLESS,
        subType: CompetitionSubType.MYSTERY,
        status: CompetitionStatus.ON_GOING,
      },
    })

    for (const competition of competitions) {
      const latestScramble = await this.scramblesRepository.findOne({
        where: { competitionId: competition.id },
        order: { number: 'DESC' },
      })
      if (!latestScramble) continue

      const conditions = await this.conditionsRepository.find({
        where: { scrambleId: latestScramble.id, revealed: false },
        order: { id: 'ASC' },
      })
      if (conditions.length === 0) continue

      const lastReveal = await this.conditionsRepository.findOne({
        where: { scrambleId: latestScramble.id, revealed: true },
        order: { revealedAt: 'DESC' },
      })
      const referenceTime = lastReveal?.revealedAt ?? latestScramble.createdAt
      if (referenceTime > threeDaysAgo) continue

      const conditionToReveal = conditions[0]
      conditionToReveal.revealed = true
      conditionToReveal.autoRevealed = true
      conditionToReveal.revealedAt = new Date()
      await this.conditionsRepository.save(conditionToReveal)
      this.logger.log(`Auto-revealed condition ${conditionToReveal.id} for level ${latestScramble.number}`)

      if (conditions.length - 1 === 0) {
        await this.generateNextChallengeLevel(competition.id, latestScramble.id, latestScramble.number)
      }
    }
  }

  private async getTriggerCountStats(competitionId: number) {
    const triggerCounts = await this.conditionsRepository
      .createQueryBuilder('c')
      .select('c.triggeredByUserId', 'userId')
      .addSelect('COUNT(*)', 'count')
      .where('c.competitionId = :competitionId', { competitionId })
      .andWhere('c.revealed = true')
      .andWhere('c.autoRevealed = false')
      .andWhere('c.triggeredByUserId IS NOT NULL')
      .groupBy('c.triggeredByUserId')
      .orderBy('count', 'DESC')
      .limit(10)
      .getRawMany()

    if (triggerCounts.length > 0) {
      const userIds = triggerCounts.map((t: any) => t.userId)
      const users = await this.submissionsRepository.manager.find(Users, { where: { id: In(userIds) } })
      const userMap = new Map(users.map(u => [u.id, u]))
      for (const t of triggerCounts) {
        t.user = userMap.get(Number(t.userId)) ?? null
        t.count = Number(t.count)
      }
    }
    return triggerCounts
  }
}
