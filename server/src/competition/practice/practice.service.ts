import { InjectQueue } from '@nestjs/bull'
import { BadRequestException, forwardRef, Inject, Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Queue } from 'bull'
import { In, Repository } from 'typeorm'

import { CreateCompetitionDto } from '@/dtos/create-comptition.dto'
import { SubmitSolutionDto } from '@/dtos/submit-solution.dto'
import {
  CompetitionFormat,
  CompetitionMode,
  Competitions,
  CompetitionStatus,
  CompetitionType,
} from '@/entities/competitions.entity'
import { DNF, DNS, Results } from '@/entities/results.entity'
import { Scrambles } from '@/entities/scrambles.entity'
import { Submissions } from '@/entities/submissions.entity'
import { Users } from '@/entities/users.entity'
import { generateScrambles } from '@/utils/scramble'

import { CompetitionService } from '../competition.service'

export interface PracticeJob {
  competitionId: number
  userId: number
  scrambleId: number
  scrambleNumber: number
  submissionId: number
  moves: number
}

@Injectable()
export class PracticeService {
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
    @InjectQueue('practice')
    private readonly queue: Queue<PracticeJob>,
    @Inject(forwardRef(() => CompetitionService))
    private readonly competitionService: CompetitionService,
  ) { }

  async getByAlias(alias: string) {
    return this.competitionService.findOne({
      where: {
        type: CompetitionType.PERSONAL_PRACTICE,
        alias,
      },
      relations: {
        scrambles: true,
        user: true,
      },
    })
  }

  async getLatest(user: Users) {
    return await this.competitionService.findOne({
      where: {
        userId: user.id,
        type: CompetitionType.PERSONAL_PRACTICE,
      },
      order: {
        createdAt: 'DESC',
      },
      relations: {
        scrambles: true,
      },
    })
  }

  async getIndexInfo() {
    const [latest, mostAttended, mostPractices] = await Promise.all([
      this.competitionsRepository
        .createQueryBuilder('c')
        .innerJoinAndSelect('c.user', 'u')
        .leftJoin('c.results', 'r')
        .loadRelationCountAndMap('c.attendees', 'c.results')
        .where('c.type = :type', { type: CompetitionType.PERSONAL_PRACTICE })
        .groupBy('c.id')
        .orderBy('c.created_at', 'DESC')
        .limit(20)
        .getMany(),
      this.competitionsRepository
        .createQueryBuilder('c')
        .innerJoinAndSelect('c.user', 'u')
        .leftJoin('c.results', 'r')
        .loadRelationCountAndMap('c.attendees', 'c.results')
        .addSelect('COUNT(r.id)', 'attendees')
        .where('c.type = :type', { type: CompetitionType.PERSONAL_PRACTICE })
        .groupBy('c.id')
        .orderBy('attendees', 'DESC')
        .limit(20)
        .getMany(),
      this.usersRepository
        .createQueryBuilder('u')
        .leftJoin('u.submissions', 's')
        .leftJoin('s.competition', 'c')
        .loadRelationCountAndMap('u.practices', 'u.submissions', 's', qb => {
          return qb
            .leftJoin('s.competition', 'c')
            .andWhere('c.type = :type', { type: CompetitionType.PERSONAL_PRACTICE })
        })
        .addSelect('COUNT(c.id)', 'practices')
        .where('c.type = :type', { type: CompetitionType.PERSONAL_PRACTICE })
        .groupBy('u.id')
        .orderBy('practices', 'DESC')
        .having('practices > 0')
        .limit(20)
        .getMany(),
    ])
    // await Promise.all(latest.map(competition => this.fetchInfo(competition)))
    return {
      latest,
      mostAttended,
      mostPractices,
    }
  }

  async getUserPractices(user: Users) {
    const created = await this.competitionsRepository
      .createQueryBuilder('c')
      .innerJoinAndSelect('c.user', 'u')
      .loadRelationCountAndMap('c.attendees', 'c.results')
      .where('c.type = :type', { type: CompetitionType.PERSONAL_PRACTICE })
      .andWhere('c.user_id = :userId', { userId: user.id })
      .orderBy('c.created_at', 'DESC')
      .getMany()
    const joined = await this.competitionsRepository
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.submissions', 's')
      .innerJoinAndSelect('c.user', 'u')
      .loadRelationCountAndMap('c.attendees', 'c.results')
      .where('c.type = :type', { type: CompetitionType.PERSONAL_PRACTICE })
      .andWhere('s.user_id = :userId', { userId: user.id })
      .andWhere('c.user_id != :userId', { userId: user.id })
      .groupBy('c.id')
      .orderBy('c.id', 'DESC')
      .getMany()
    return {
      created,
      joined,
    }
  }

  async fetchInfo(competition: Competitions, siblings = false) {
    const [attendees, ownerResult] = await Promise.all([
      this.resultsRepository.countBy({
        competitionId: competition.id,
      }),
      this.resultsRepository.findOneBy({
        competitionId: competition.id,
        userId: competition.userId,
      }),
    ])
    competition.attendees = attendees
    competition.ownerResult = ownerResult
    if (siblings) {
      const index = parseInt(competition.alias.split('-').pop(), 10)
      const prev = await this.competitionsRepository.findOne({
        where: {
          alias: `practice-${competition.userId}-${index - 1}`,
        },
        relations: {
          user: true,
        },
      })
      const next = await this.competitionsRepository.findOne({
        where: {
          alias: `practice-${competition.userId}-${index + 1}`,
        },
        relations: {
          user: true,
        },
      })
      competition.prevCompetition = prev
      competition.nextCompetition = next
    }
  }

  async checkFinished(user: Users, competition: Competitions): Promise<[boolean, boolean]> {
    const scrambles = competition.scrambles
    if (scrambles.length === 0) {
      return [false, false]
    }
    const submissions = await this.submissionsRepository.findBy({
      scrambleId: In(scrambles.map(s => s.id)),
      userId: user.id,
    })
    const submissionsMap = submissions.reduce(
      (acc, sub) => {
        acc[sub.scrambleId] = sub
        return acc
      },
      {} as Record<number, Submissions>,
    )
    if (scrambles.every(({ id }) => id in submissionsMap)) {
      return [true, submissions.some(s => s.moves > 0 && s.moves !== DNF && s.moves !== DNS)]
    }
    return [false, false]
  }

  async count(user: Users) {
    return await this.competitionsRepository.countBy({
      type: CompetitionType.PERSONAL_PRACTICE,
      userId: user.id,
    })
  }

  async create(user: Users, dto: CreateCompetitionDto) {
    const count = await this.count(user)
    const competition = new Competitions()
    const format = dto.format === CompetitionFormat.MO3 ? CompetitionFormat.MO3 : CompetitionFormat.BO1
    competition.userId = user.id
    competition.user = user
    competition.type = CompetitionType.PERSONAL_PRACTICE
    competition.format = format
    competition.name = `Practice #${count + 1}`
    competition.alias = `practice-${user.id}-${count + 1}`
    competition.startTime = new Date()
    competition.status = CompetitionStatus.ON_GOING
    await this.competitionsRepository.save(competition)
    const scrambleNum = format === CompetitionFormat.MO3 ? 3 : 1
    const scrambles = generateScrambles(scrambleNum).map((str, number) => {
      const scramble = new Scrambles()
      scramble.number = number + 1
      scramble.scramble = str
      scramble.competitionId = competition.id
      return scramble
    })
    competition.scrambles = scrambles
    await this.scramblesRepository.save(scrambles)
    return competition
  }

  async submitSolution(competition: Competitions, user: Users, solution: SubmitSolutionDto) {
    if (competition.hasEnded) {
      throw new BadRequestException('Competition has ended')
    }
    const submission = await this.submissionsRepository.manager.transaction(async manager => {
      const scramble = await manager.findOne(Scrambles, {
        where: {
          id: solution.scrambleId,
          competitionId: competition.id,
        },
        lock: { mode: 'pessimistic_write' },
      })
      if (scramble === null) {
        throw new BadRequestException('Invalid scramble')
      }
      const preSubmission = await manager.findOne(Submissions, {
        where: {
          scrambleId: scramble.id,
          userId: user.id,
        },
      })
      if (preSubmission !== null) {
        throw new BadRequestException('You have already submitted a solution')
      }

      const submission = await this.competitionService.createSubmission(competition, scramble, user, solution)
      let result = await manager.findOne(Results, {
        where: {
          competitionId: competition.id,
          userId: user.id,
        },
      })
      if (result === null) {
        result = new Results()
        result.mode = CompetitionMode.REGULAR
        result.competition = competition
        result.user = user
        result.values = competition.scrambles.map(() => 0)
        result.best = 0
        result.average = 0
        await manager.save(result)
      }
      submission.result = result
      await manager.save(submission)
      result.values[scramble.number - 1] = submission.moves
      const nonZeroValues = result.values.filter(value => value > 0)
      result.best = Math.min(...nonZeroValues)
      result.average = Math.round(nonZeroValues.reduce((a, b) => a + b, 0) / nonZeroValues.length)
      if (result.values.some(v => v === DNF || v === DNS)) {
        result.average = DNF
      }
      await manager.save(result)
      return submission
    })
    await this.queue.add({
      competitionId: competition.id,
      userId: user.id,
      scrambleId: solution.scrambleId,
      scrambleNumber: 0,
      submissionId: submission.id,
      moves: submission.moves,
    })
    return submission
  }

  async update(
    competition: Competitions,
    user: Users,
    id: number,
    solution: Pick<SubmitSolutionDto, 'comment' | 'attachments'>,
  ) {
    return await this.competitionService.updateUserSubmission(competition, user, id, solution)
  }

  async updateDescription(competition: Competitions, user: Users, description: string) {
    if (competition.userId !== user.id) {
      throw new BadRequestException('Only the owner can update description')
    }
    competition.description = description.trim() || null
    await this.competitionsRepository.save(competition)
    return competition
  }
}
