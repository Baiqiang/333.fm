import { InjectQueue } from '@nestjs/bull'
import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Queue } from 'bull'
import { In, Repository } from 'typeorm'

import {
  type ConditionDef,
  type EndlessJob,
  generateConditions,
  isBossLevel,
  normalizeSolution,
} from '@/competition/endless/endless.service'
import {
  BossChallenge,
  Challenges,
  ChallengeType,
  getDamage,
  getRandomBossHitPoints,
  matchesChallengeLevel,
} from '@/entities/challenges.entity'
import {
  CompetitionFormat,
  Competitions,
  CompetitionStatus,
  CompetitionSubType,
  CompetitionType,
} from '@/entities/competitions.entity'
import {
  type AllDifferentMovesParams,
  type ConditionParams,
  ConditionType,
  type ConsecutiveMovesParams,
  EndlessChallengeConditions,
  type MovesEqualParams,
  type MovesGeParams,
  type MovesLeParams,
  type MovesParityParams,
  ParityType,
  type SameMovesParams,
  type SameSolutionParams,
  type TotalSubmissionsParams,
} from '@/entities/endless-challenge-conditions.entity'
import { EndlessKickoffs } from '@/entities/endless-kickoffs.entity'
import { DNF, DNS } from '@/entities/results.entity'
import { Scrambles } from '@/entities/scrambles.entity'
import { Submissions } from '@/entities/submissions.entity'
import { generateScramble } from '@/utils/scramble'

interface EndlessChallengeRuleInput {
  type: ChallengeType
  startLevel?: number
  endLevel?: number
  levels?: number[]
  challenge: BossChallenge
}

const DEFAULT_USER_ID = 1

interface SimulatedSubmission {
  moves: number
  solution: string
}

function buildBossChallengeRules(): EndlessChallengeRuleInput[] {
  const rules: EndlessChallengeRuleInput[] = []
  const regularInstantKills = [2400, 2300, 2300, 2300, 2200, 2200, 2200, 2100, 2100, 2100]
  const majorInstantKills = [2200, 2200, 2200, 2100, 2100, 2100, 2000, 2000, 1900, 1900]
  const regularHitPointRanges: Array<[number, number]> = [
    [70, 110],
    [90, 130],
    [110, 160],
    [130, 190],
    [150, 210],
    [170, 230],
    [190, 250],
    [210, 280],
    [230, 310],
    [250, 340],
  ]
  const majorHitPointRanges: Array<[number, number]> = [
    [180, 260],
    [220, 320],
    [260, 380],
    [320, 450],
    [380, 540],
    [450, 630],
    [540, 760],
    [650, 900],
    [780, 1080],
    [900, 1250],
  ]
  for (let tier = 0; tier < 10; tier++) {
    const startLevel = tier * 10 + 1
    const bossLevel = startLevel + 9
    const [regularMinHitPoints, regularMaxHitPoints] = regularHitPointRanges[tier]
    const [majorMinHitPoints, majorMaxHitPoints] = majorHitPointRanges[tier]
    rules.push({
      type: ChallengeType.BOSS,
      startLevel,
      endLevel: bossLevel - 1,
      challenge: {
        instantKill: regularInstantKills[tier],
        minHitPoints: regularMinHitPoints,
        maxHitPoints: regularMaxHitPoints,
      },
    })
    rules.push({
      type: ChallengeType.BOSS,
      levels: [bossLevel],
      challenge: {
        instantKill: majorInstantKills[tier],
        minHitPoints: majorMinHitPoints,
        maxHitPoints: majorMaxHitPoints,
      },
    })
  }
  return rules
}

const HP_BOSS_CHALLENGE_RULES = buildBossChallengeRules()

@Injectable()
export class EndlessCommandService {
  private readonly logger = new Logger(EndlessCommandService.name)

  constructor(
    @InjectRepository(Competitions)
    private readonly competitionsRepository: Repository<Competitions>,
    @InjectRepository(Challenges)
    private readonly challengesRepository: Repository<Challenges>,
    @InjectRepository(Scrambles)
    private readonly scramblesRepository: Repository<Scrambles>,
    @InjectRepository(Submissions)
    private readonly submissionsRepository: Repository<Submissions>,
    @InjectRepository(EndlessChallengeConditions)
    private readonly conditionsRepository: Repository<EndlessChallengeConditions>,
    @InjectRepository(EndlessKickoffs)
    private readonly kickoffsRepository: Repository<EndlessKickoffs>,
    @InjectQueue('endless')
    private readonly queue: Queue<EndlessJob>,
  ) {}

  async openBoss(alias: string, startTimeRaw?: string, endTimeRaw?: string) {
    if (!alias) {
      throw new BadRequestException('Alias is required')
    }
    const existing = await this.competitionsRepository.findOne({
      where: {
        alias,
      },
    })
    if (existing) {
      throw new BadRequestException(`Competition alias already exists: ${alias}`)
    }
    const startTime = this.parseDate(startTimeRaw) ?? new Date()
    const endTime = this.parseDate(endTimeRaw)
    if (endTime && endTime <= startTime) {
      throw new BadRequestException('endTime must be later than startTime')
    }
    const competition = new Competitions()
    competition.alias = alias
    competition.name = `Boss ${alias}`
    competition.type = CompetitionType.ENDLESS
    competition.subType = CompetitionSubType.BOSS_CHALLENGE
    competition.format = CompetitionFormat.BO1
    competition.userId = DEFAULT_USER_ID
    competition.startTime = startTime
    competition.endTime = endTime
    competition.status = startTime <= new Date() ? CompetitionStatus.ON_GOING : CompetitionStatus.NOT_STARTED
    await this.competitionsRepository.save(competition)

    const challenges = HP_BOSS_CHALLENGE_RULES.map(rule => {
      const challenge = new Challenges()
      challenge.competitionId = competition.id
      challenge.type = rule.type
      challenge.startLevel = rule.startLevel
      challenge.endLevel = rule.endLevel
      challenge.levels = rule.levels
      challenge.challenge = rule.challenge
      return challenge
    })
    await this.challengesRepository.save(challenges)

    if (competition.status === CompetitionStatus.ON_GOING) {
      const scramble = new Scrambles()
      scramble.competitionId = competition.id
      scramble.number = 1
      scramble.scramble = generateScramble()
      scramble.initialHP = getRandomBossHitPoints(HP_BOSS_CHALLENGE_RULES[0].challenge)
      scramble.currentHP = scramble.initialHP
      await this.scramblesRepository.save(scramble)
    }

    this.logger.log(`Created boss endless ${competition.alias} (#${competition.id})`)
    return competition
  }

  async openChallenge(alias: string, name?: string, startTimeRaw?: string, endTimeRaw?: string) {
    if (!alias) {
      throw new BadRequestException('Alias is required')
    }
    const existing = await this.competitionsRepository.findOne({ where: { alias } })
    if (existing) {
      throw new BadRequestException(`Competition alias already exists: ${alias}`)
    }
    const startTime = this.parseDate(startTimeRaw) ?? new Date()
    const endTime = this.parseDate(endTimeRaw)
    if (endTime && endTime <= startTime) {
      throw new BadRequestException('endTime must be later than startTime')
    }
    const competition = new Competitions()
    competition.alias = alias
    competition.name = name || `Endless Challenge ${alias}`
    competition.type = CompetitionType.ENDLESS
    competition.subType = CompetitionSubType.MYSTERY
    competition.format = CompetitionFormat.BO1
    competition.userId = DEFAULT_USER_ID
    competition.startTime = startTime
    competition.endTime = endTime
    competition.status = startTime <= new Date() ? CompetitionStatus.ON_GOING : CompetitionStatus.NOT_STARTED
    await this.competitionsRepository.save(competition)

    if (competition.status === CompetitionStatus.ON_GOING) {
      const scramble = new Scrambles()
      scramble.competitionId = competition.id
      scramble.number = 1
      scramble.scramble = generateScramble()
      await this.scramblesRepository.save(scramble)

      const conditions = this.generateLevel1Conditions()
      const entities = conditions.map(c => {
        const entity = new EndlessChallengeConditions()
        entity.competitionId = competition.id
        entity.scrambleId = scramble.id
        entity.type = c.type
        entity.params = c.params
        return entity
      })
      await this.conditionsRepository.save(entities)
      this.logger.log(`Level 1 conditions: ${entities.map(e => `${e.type}(${JSON.stringify(e.params)})`).join(', ')}`)
    }

    this.logger.log(
      `Created endless challenge "${competition.name}" (${competition.alias}, #${competition.id}), status: ${CompetitionStatus[competition.status]}`,
    )
    return competition
  }

  private pick<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)]
  }

  private generateLevel1Conditions(): { type: ConditionType; params: ConditionParams }[] {
    // T0: 1 condition, easy solo targets, EQ/LE/GE always count=1 at level 1
    const eqTargets = [2200, 2300, 2400, 2500, 2600]
    const leTargets = [2200, 2300, 2400, 2500, 2600]
    const geTargets = [2200, 2300, 2400, 2500, 2600]
    const pool: { type: ConditionType; params: ConditionParams }[] = [
      { type: ConditionType.MOVES_EQUAL, params: { moves: this.pick(eqTargets), count: 1 } as MovesEqualParams },
      { type: ConditionType.MOVES_LE, params: { moves: this.pick(leTargets), count: 1 } as MovesLeParams },
      { type: ConditionType.MOVES_GE, params: { moves: this.pick(geTargets), count: 1 } as MovesGeParams },
      {
        type: ConditionType.MOVES_PARITY,
        params: { parity: this.pick([ParityType.EVEN, ParityType.ODD]) } as MovesParityParams,
      },
      { type: ConditionType.TOTAL_SUBMISSIONS, params: { count: 3 } as TotalSubmissionsParams },
    ]
    return [this.pick(pool)]
  }

  async end(alias: string) {
    if (!alias) {
      throw new BadRequestException('Alias is required')
    }
    const competition = await this.competitionsRepository.findOne({
      where: {
        alias,
        type: CompetitionType.ENDLESS,
      },
    })
    if (!competition) {
      throw new NotFoundException(`Endless not found: ${alias}`)
    }
    competition.endTime = new Date()
    competition.status = CompetitionStatus.ENDED
    await this.competitionsRepository.save(competition)
    this.logger.log(`Ended endless ${competition.alias} (#${competition.id})`)
    return competition
  }

  async printBossStats(alias: string) {
    if (!alias) {
      throw new BadRequestException('Alias is required')
    }
    const competition = await this.competitionsRepository.findOne({
      where: {
        alias,
        type: CompetitionType.ENDLESS,
        subType: CompetitionSubType.BOSS_CHALLENGE,
      },
      relations: {
        challenges: true,
      },
    })
    if (!competition) {
      throw new NotFoundException(`Boss endless not found: ${alias}`)
    }

    const scrambles = await this.scramblesRepository.find({
      where: { competitionId: competition.id },
      order: { number: 'ASC' },
      relations: {
        kickoffs: {
          submission: {
            user: true,
          },
          user: true,
        },
      },
    })
    if (scrambles.length === 0) {
      this.logger.warn(`No levels found for ${competition.alias} (#${competition.id})`)
      return
    }

    const submissions = await this.submissionsRepository.find({
      where: {
        scrambleId: In(scrambles.map(scramble => scramble.id)),
      },
      order: {
        moves: 'ASC',
      },
      relations: {
        user: true,
      },
    })
    const submissionsByScramble = new Map<number, Submissions[]>()
    for (const submission of submissions) {
      const entries = submissionsByScramble.get(submission.scrambleId) ?? []
      entries.push(submission)
      submissionsByScramble.set(submission.scrambleId, entries)
    }

    let instantKillCount = 0
    let teamKillCount = 0
    let unbeatenCount = 0
    const unlockedLevels = new Set(scrambles.map(scramble => scramble.number))
    const rows = scrambles.map(scramble => {
      const challenge = competition.challenges?.find(entry => matchesChallengeLevel(entry, scramble.number))
      const bossChallenge = challenge?.isBoss ? challenge.bossChallenge : undefined
      const levelSubmissions = submissionsByScramble.get(scramble.id) ?? []
      const totalDamage = levelSubmissions.reduce((sum, submission) => sum + submission.damage, 0)
      const bestSubmission = levelSubmissions[0]
      const defeated = scramble.currentHP <= 0 || unlockedLevels.has(scramble.number + 1)
      const instantKickoff = bossChallenge
        ? scramble.kickoffs?.find(kickoff => {
            const submission = kickoff.submission
            return submission && submission.bossInstantKill
          })
        : undefined
      const result = !defeated ? '未击破' : instantKickoff ? '秒杀' : '合力击破'
      if (result === '秒杀') {
        instantKillCount++
      } else if (result === '合力击破') {
        teamKillCount++
      } else {
        unbeatenCount++
      }

      return {
        level: scramble.number,
        result,
        hp: `${scramble.initialHP}->${scramble.currentHP}`,
        instantKill: bossChallenge?.instantKill ?? '',
        submissions: levelSubmissions.length,
        best: bestSubmission ? this.formatMoves(bestSubmission.moves) : '',
        damage: totalDamage,
        kickedOffBy: (scramble.kickoffs ?? [])
          .map(kickoff => {
            const submission = kickoff.submission
            const name = submission?.user?.name ?? kickoff.user?.name ?? `user#${kickoff.userId}`
            return submission ? `${name}(${this.formatMoves(submission.moves)})` : name
          })
          .join(', '),
      }
    })

    this.logger.log(`Boss stats for ${competition.alias} (#${competition.id})`)
    console.table(rows)
    this.logger.log(`Summary: ${instantKillCount} instant kill, ${teamKillCount} team kill, ${unbeatenCount} unbeaten`)
  }

  async fixBossLongMoveDamage(alias: string) {
    if (!alias) {
      throw new BadRequestException('Alias is required')
    }
    const competition = await this.competitionsRepository.findOne({
      where: {
        alias,
        type: CompetitionType.ENDLESS,
        subType: CompetitionSubType.BOSS_CHALLENGE,
      },
    })
    if (!competition) {
      throw new NotFoundException(`Boss endless not found: ${alias}`)
    }

    const scrambles = await this.scramblesRepository.find({
      where: { competitionId: competition.id },
      order: { number: 'ASC' },
    })
    let fixed = 0
    const rows: Array<{ level: number; fixed: number }> = []
    for (let i = 0; i < scrambles.length; i++) {
      const scramble = scrambles[i]
      const nextScramble = scrambles[i + 1]
      const defeatedAt = nextScramble?.createdAt ?? (scramble.currentHP <= 0 ? scramble.updatedAt : null)
      if (!defeatedAt) {
        continue
      }

      const submissions = await this.submissionsRepository
        .createQueryBuilder('submission')
        .where('submission.scramble_id = :scrambleId', { scrambleId: scramble.id })
        .andWhere('submission.created_at <= :defeatedAt', { defeatedAt })
        .andWhere('submission.moves >= :moves', { moves: 2700 })
        .andWhere('submission.moves NOT IN (:...invalidMoves)', { invalidMoves: [DNF, DNS] })
        .andWhere('submission.damage = 0')
        .getMany()
      for (const submission of submissions) {
        submission.damage = 1
      }
      if (submissions.length > 0) {
        await this.submissionsRepository.save(submissions)
        fixed += submissions.length
        rows.push({ level: scramble.number, fixed: submissions.length })
      }
    }

    this.logger.log(`Fixed ${fixed} long-move boss submissions for ${competition.alias} (#${competition.id})`)
    if (rows.length > 0) {
      console.table(rows)
    }
  }

  async fixBossInstantKills(alias: string) {
    if (!alias) {
      throw new BadRequestException('Alias is required')
    }
    const competition = await this.competitionsRepository.findOne({
      where: {
        alias,
        type: CompetitionType.ENDLESS,
        subType: CompetitionSubType.BOSS_CHALLENGE,
      },
      relations: {
        challenges: true,
      },
    })
    if (!competition) {
      throw new NotFoundException(`Boss endless not found: ${alias}`)
    }

    const scrambles = await this.scramblesRepository.find({
      where: { competitionId: competition.id },
      order: { number: 'ASC' },
    })
    const scrambleIds = scrambles.map(scramble => scramble.id)
    if (scrambleIds.length === 0) {
      this.logger.warn(`No levels found for ${competition.alias} (#${competition.id})`)
      return
    }

    await this.submissionsRepository.update(
      {
        competitionId: competition.id,
        bossInstantKill: true,
      },
      {
        bossInstantKill: false,
      },
    )

    const fixedSubmissions: Submissions[] = []
    const rows: Array<{ level: number; submissionId: number; userId: number; moves: string }> = []
    for (const scramble of scrambles) {
      const challenge = competition.challenges?.find(entry => matchesChallengeLevel(entry, scramble.number))
      if (!challenge?.isBoss) {
        continue
      }

      const kickoffs = await this.kickoffsRepository.find({
        where: {
          competitionId: competition.id,
          scrambleId: scramble.id,
        },
        relations: {
          submission: true,
        },
      })
      const bossChallenge = challenge.bossChallenge
      for (const kickoff of kickoffs) {
        const submission = kickoff.submission
        if (submission && submission.moves <= bossChallenge.instantKill && submission.damage === 0) {
          submission.bossInstantKill = true
          fixedSubmissions.push(submission)
          rows.push({
            level: scramble.number,
            submissionId: submission.id,
            userId: submission.userId,
            moves: this.formatMoves(submission.moves),
          })
        }
      }
    }

    if (fixedSubmissions.length > 0) {
      await this.submissionsRepository.save(fixedSubmissions)
    }
    this.logger.log(
      `Fixed ${fixedSubmissions.length} boss instant-kill submissions for ${competition.alias} (#${competition.id})`,
    )
    if (rows.length > 0) {
      console.table(rows)
    }
  }

  async retryJobs(submissionIdRaws: string[]) {
    const submissionIds = this.parseSubmissionIds(submissionIdRaws)

    for (const submissionId of submissionIds) {
      const submission = await this.submissionsRepository.findOne({
        where: {
          id: submissionId,
        },
        relations: {
          competition: true,
          scramble: true,
        },
      })
      if (!submission) {
        throw new NotFoundException(`Submission not found: ${submissionId}`)
      }
      if (submission.competition.type !== CompetitionType.ENDLESS) {
        throw new BadRequestException(`Submission ${submissionId} is not from an endless competition`)
      }

      const previousLevelDnfPenalty = await this.getPreviousLevelDnfPenalty(submission)
      const data: EndlessJob = {
        competitionId: submission.competitionId,
        userId: submission.userId,
        scrambleId: submission.scrambleId,
        scrambleNumber: submission.scramble.number,
        submissionId: submission.id,
        moves: submission.moves,
        previousLevelDnfPenalty,
        solution: submission.solution,
      }
      const job = await this.queue.add(data)
      this.logger.log(
        `Queued endless job ${job.id} for submission ${submission.id}, competition ${submission.competitionId}, level ${submission.scramble.number}`,
      )
    }
  }

  async simulateOldBoss(alias: string, runs = 1000) {
    if (!alias) {
      throw new BadRequestException('Alias is required')
    }
    if (!Number.isInteger(runs) || runs <= 0) {
      throw new BadRequestException('runs must be a positive integer')
    }
    const competition = await this.competitionsRepository.findOne({
      where: {
        alias,
        type: CompetitionType.ENDLESS,
        subType: CompetitionSubType.BOSS_CHALLENGE,
      },
    })
    if (!competition) {
      throw new NotFoundException(`Boss endless not found: ${alias}`)
    }
    const submissionsByLevel = await this.getValidSubmissionsByLevel(competition.id)
    const levelsReached = Array.from({ length: runs }, () => this.simulateOnce(submissionsByLevel))
    levelsReached.sort((a, b) => a - b)
    const total = levelsReached.reduce((sum, level) => sum + level, 0)
    const min = levelsReached[0]
    const max = levelsReached[levelsReached.length - 1]
    const average = Number((total / levelsReached.length).toFixed(2))
    const median = levelsReached[Math.floor(levelsReached.length / 2)]
    const p10 = levelsReached[Math.floor(levelsReached.length * 0.1)]
    const p90 = levelsReached[Math.floor(levelsReached.length * 0.9)]
    const deterministicByMaxHp = this.simulateOnce(submissionsByLevel, 'max')
    const deterministicByMinHp = this.simulateOnce(submissionsByLevel, 'min')
    this.logger.log(`Simulation target: ${competition.alias} (#${competition.id})`)
    this.logger.log(`Runs: ${runs}`)
    this.logger.log(`Levels reached with min HP: ${deterministicByMinHp}`)
    this.logger.log(`Levels reached with max HP: ${deterministicByMaxHp}`)
    this.logger.log(`Monte Carlo min/median/avg/max: ${min}/${median}/${average}/${max}`)
    this.logger.log(`Monte Carlo p10/p90: ${p10}/${p90}`)
  }

  async simulateChallenge(alias: string, runs = 1000) {
    if (!alias) {
      throw new BadRequestException('Alias is required')
    }
    if (!Number.isInteger(runs) || runs <= 0) {
      throw new BadRequestException('runs must be a positive integer')
    }
    const competition = await this.competitionsRepository.findOne({
      where: {
        alias,
        type: CompetitionType.ENDLESS,
        subType: CompetitionSubType.BOSS_CHALLENGE,
      },
    })
    if (!competition) {
      throw new NotFoundException(`Boss endless not found: ${alias}`)
    }

    const submissionsByLevel = await this.getValidSubmissionsByLevel(competition.id)
    const results = Array.from({ length: runs }, () => this.simulateChallengeOnce(submissionsByLevel))
    const levelsReached = results.map(result => result.level).sort((a, b) => a - b)
    const total = levelsReached.reduce((sum, level) => sum + level, 0)
    const min = levelsReached[0]
    const max = levelsReached[levelsReached.length - 1]
    const average = Number((total / levelsReached.length).toFixed(2))
    const median = levelsReached[Math.floor(levelsReached.length / 2)]
    const p10 = levelsReached[Math.floor(levelsReached.length * 0.1)]
    const p90 = levelsReached[Math.floor(levelsReached.length * 0.9)]
    const stoppedByLevel = new Map<number, number>()
    for (const result of results) {
      stoppedByLevel.set(result.failedLevel, (stoppedByLevel.get(result.failedLevel) ?? 0) + 1)
    }
    const commonStops = [...stoppedByLevel.entries()]
      .sort((a, b) => b[1] - a[1] || a[0] - b[0])
      .slice(0, 5)
      .map(([level, count]) => `L${level}: ${count}`)
      .join(', ')

    this.logger.log(`Mystery simulation source: ${competition.alias} (#${competition.id})`)
    this.logger.log(`Runs: ${runs}`)
    this.logger.log(`Levels reached min/median/avg/max: ${min}/${median}/${average}/${max}`)
    this.logger.log(`Levels reached p10/p90: ${p10}/${p90}`)
    this.logger.log(`Most common failed levels: ${commonStops}`)
  }

  private async getValidSubmissionsByLevel(competitionId: number) {
    const submissions = await this.submissionsRepository.find({
      where: {
        competitionId,
      },
      relations: {
        scramble: true,
        user: true,
      },
      order: {
        scramble: {
          number: 'ASC',
        },
        createdAt: 'ASC',
      },
    })
    const submissionsByLevel: Record<number, Submissions[]> = {}
    for (const submission of submissions) {
      if (!submission.scramble || submission.moves === DNF || submission.moves <= 0) {
        continue
      }
      const level = submission.scramble.number
      submissionsByLevel[level] ??= []
      submissionsByLevel[level].push(submission)
    }
    return submissionsByLevel
  }

  private simulateChallengeOnce(submissionsByLevel: Record<number, Submissions[]>) {
    const generatedRegularTypesByBlock = new Map<number, Set<ConditionType>>()
    let highestUnlockedLevel = 0

    for (let level = 1; ; level++) {
      const submissions = submissionsByLevel[level] ?? []
      if (submissions.length === 0) {
        return { level: highestUnlockedLevel, failedLevel: level }
      }

      const block = Math.floor((level - 1) / 10)
      const blockUsedTypes = isBossLevel(level) ? undefined : new Set(generatedRegularTypesByBlock.get(block) ?? [])
      const simulatedSubmissions = submissions.map(submission => ({
        moves: submission.moves - (Math.random() < 0.5 ? 100 : 0),
        solution: submission.solution,
      }))
      const conditions = generateConditions(level, blockUsedTypes)
      if (!this.isMysteryLevelCleared(conditions, simulatedSubmissions)) {
        return { level: highestUnlockedLevel, failedLevel: level }
      }

      if (!isBossLevel(level)) {
        const usedTypes = generatedRegularTypesByBlock.get(block) ?? new Set<ConditionType>()
        for (const condition of conditions) {
          usedTypes.add(condition.type)
        }
        generatedRegularTypesByBlock.set(block, usedTypes)
      }
      highestUnlockedLevel = level
    }
  }

  private isMysteryLevelCleared(conditions: ConditionDef[], submissions: SimulatedSubmission[]) {
    return conditions.every(condition => this.checkMysteryCondition(condition, submissions))
  }

  private checkMysteryCondition(condition: ConditionDef, submissions: SimulatedSubmission[]) {
    switch (condition.type) {
      case ConditionType.MOVES_EQUAL: {
        const { moves: target, count: n = 1 } = condition.params as MovesEqualParams
        return submissions.filter(s => s.moves === target).length >= n
      }
      case ConditionType.MOVES_LE: {
        const { moves: target, count: n = 1 } = condition.params as MovesLeParams
        return submissions.filter(s => s.moves <= target).length >= n
      }
      case ConditionType.MOVES_GE: {
        const { moves: target, count: n = 1 } = condition.params as MovesGeParams
        return submissions.filter(s => s.moves >= target).length >= n
      }
      case ConditionType.MOVES_PARITY: {
        const { parity } = condition.params as MovesParityParams
        return submissions.some(submission => {
          const moves = Math.floor(submission.moves / 100)
          switch (parity) {
            case ParityType.EVEN:
              return moves % 2 === 0
            case ParityType.ODD:
              return moves % 2 === 1
            case ParityType.MULTIPLE_OF_3:
              return moves % 3 === 0
            case ParityType.MULTIPLE_OF_5:
              return moves % 5 === 0
            case ParityType.MULTIPLE_OF_7:
              return moves % 7 === 0
          }
        })
      }
      case ConditionType.SAME_SOLUTION: {
        const { count } = condition.params as SameSolutionParams
        const counts = new Map<string, number>()
        for (const submission of submissions) {
          const key = normalizeSolution(submission.solution)
          const next = (counts.get(key) ?? 0) + 1
          if (next >= count) return true
          counts.set(key, next)
        }
        return false
      }
      case ConditionType.SAME_MOVES: {
        const { count } = condition.params as SameMovesParams
        const counts = new Map<number, number>()
        for (const submission of submissions) {
          const next = (counts.get(submission.moves) ?? 0) + 1
          if (next >= count) return true
          counts.set(submission.moves, next)
        }
        return false
      }
      case ConditionType.ALL_DIFFERENT_MOVES: {
        const { minSubmissions } = condition.params as AllDifferentMovesParams
        return new Set(submissions.map(s => s.moves)).size >= minSubmissions
      }
      case ConditionType.TOTAL_SUBMISSIONS: {
        const { count } = condition.params as TotalSubmissionsParams
        return submissions.length >= count
      }
      case ConditionType.CONSECUTIVE_MOVES: {
        const { count: n, diff } = condition.params as ConsecutiveMovesParams
        const sorted = [...new Set(submissions.map(s => s.moves))].sort((a, b) => a - b)
        for (let i = 0; i <= sorted.length - n; i++) {
          let ok = true
          for (let j = 1; j < n; j++) {
            if (sorted[i + j] - sorted[i + j - 1] !== diff) {
              ok = false
              break
            }
          }
          if (ok) return true
        }
        return false
      }
    }
  }

  private parseDate(value?: string) {
    if (!value) {
      return null
    }
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(`Invalid date: ${value}`)
    }
    return date
  }

  private parseSubmissionIds(values: string[]) {
    if (values.length === 0) {
      throw new BadRequestException('At least one submission id is required')
    }
    return values.map(value => {
      const id = Number(value)
      if (!Number.isInteger(id) || id <= 0) {
        throw new BadRequestException(`Invalid submission id: ${value}`)
      }
      return id
    })
  }

  private formatMoves(moves: number) {
    return moves === DNF ? 'DNF' : String(moves / 100)
  }

  private async getPreviousLevelDnfPenalty(submission: Submissions) {
    if (submission.competition.subType !== CompetitionSubType.BOSS_CHALLENGE || submission.scramble.number <= 1) {
      return false
    }
    const previousScramble = await this.scramblesRepository.findOne({
      where: {
        competitionId: submission.competitionId,
        number: submission.scramble.number - 1,
      },
    })
    if (!previousScramble) {
      throw new NotFoundException(`Previous scramble not found for submission ${submission.id}`)
    }
    const previousSubmission = await this.submissionsRepository.findOne({
      where: {
        scrambleId: previousScramble.id,
        userId: submission.userId,
      },
    })
    if (!previousSubmission) {
      throw new NotFoundException(`Previous submission not found for submission ${submission.id}`)
    }
    return previousSubmission.moves === DNF
  }

  private getBossChallenge(level: number) {
    return HP_BOSS_CHALLENGE_RULES.find(rule => matchesChallengeLevel(rule, level))
  }

  private simulateOnce(submissionsByLevel: Record<number, Submissions[]>, hpMode: 'random' | 'min' | 'max' = 'random') {
    let highestUnlockedLevel = 0
    for (let level = 1; ; level++) {
      const challenge = this.getBossChallenge(level)
      if (!challenge) {
        return highestUnlockedLevel
      }
      const submissions = submissionsByLevel[level] ?? []
      if (submissions.length === 0) {
        return highestUnlockedLevel
      }
      const bossChallenge = challenge.challenge
      const isInstantKilled = submissions.some(
        submission => submission.moves - (Math.random() < 0.5 ? 100 : 0) <= bossChallenge.instantKill,
      )
      if (isInstantKilled) {
        highestUnlockedLevel = level
        continue
      }
      const hp =
        hpMode === 'min'
          ? bossChallenge.minHitPoints
          : hpMode === 'max'
            ? bossChallenge.maxHitPoints
            : getRandomBossHitPoints(bossChallenge)
      const totalDamage = submissions.reduce(
        (sum, submission) => sum + getDamage(submission.moves - (Math.random() < 0.5 ? 100 : 0)),
        0,
      )
      if (totalDamage < hp) {
        return highestUnlockedLevel
      }
      highestUnlockedLevel = level
    }
  }
}
