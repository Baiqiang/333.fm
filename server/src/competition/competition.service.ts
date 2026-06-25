import { BadRequestException, forwardRef, Inject, Injectable, Logger } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'
import { InjectRepository } from '@nestjs/typeorm'
import { FindManyOptions, FindOneOptions, In, Not, Repository } from 'typeorm'

import { AttachmentService } from '@/attachment/attachment.service'
import { SubmitSolutionDto } from '@/dtos/submit-solution.dto'
import { Attachments } from '@/entities/attachment.entity'
import { Competitions, CompetitionStatus, CompetitionType } from '@/entities/competitions.entity'
import { Results } from '@/entities/results.entity'
import { Scrambles } from '@/entities/scrambles.entity'
import { Submissions } from '@/entities/submissions.entity'
import { Users } from '@/entities/users.entity'
import { UserService } from '@/user/user.service'
import { calculateMoves } from '@/utils'

import { ChainService } from './chain/chain.service'
import { EndlessService } from './endless/endless.service'
import { LeagueService } from './league/league.service'
import { WeeklyService } from './weekly/weekly.service'

@Injectable()
export class CompetitionService {
  private readonly logger = new Logger(CompetitionService.name)
  private updating = false

  constructor(
    @InjectRepository(Competitions)
    private readonly competitionsRepository: Repository<Competitions>,
    @InjectRepository(Submissions)
    private readonly submissionsRepository: Repository<Submissions>,
    @InjectRepository(Results)
    private readonly resultsRepository: Repository<Results>,
    private readonly attachmentService: AttachmentService,
    private readonly weeklyService: WeeklyService,
    private readonly endlessService: EndlessService,
    @Inject(forwardRef(() => ChainService))
    private readonly chainService: ChainService,
    @Inject(forwardRef(() => LeagueService))
    private readonly leagueService: LeagueService,
    private readonly userService: UserService,
  ) {}

  @Cron('* * * * *')
  async updateCompetitions() {
    if (this.updating) {
      return
    }
    this.updating = true
    try {
      const onGoings = await this.competitionsRepository.find({
        where: {
          status: CompetitionStatus.ON_GOING,
          type: Not(In([CompetitionType.PERSONAL_PRACTICE])), // don't update personal practice competitions
        },
      })
      const now = new Date()
      if (onGoings.length > 0) {
        this.logger.log(`Updating ${onGoings.length} on-going competitions`)
      }
      for (const competition of onGoings) {
        if (competition.endTime !== null && competition.endTime <= now) {
          competition.status = CompetitionStatus.ENDED
          switch (competition.type) {
            case CompetitionType.WEEKLY:
            case CompetitionType.DAILY:
              await this.weeklyService.calculateResults(competition)
              break
            case CompetitionType.LEAGUE:
              await this.weeklyService.calculateResults(competition)
              await this.leagueService.calculatePoints(competition)
              await this.leagueService.calculateElos(competition)
              break

            default:
              break
          }
        }
      }
      await this.competitionsRepository.save(onGoings)
      const notStarteds = await this.competitionsRepository.find({
        where: {
          status: CompetitionStatus.NOT_STARTED,
        },
      })
      if (notStarteds.length > 0) {
        this.logger.log(`Updating ${notStarteds.length} not started competitions`)
      }
      for (const competition of notStarteds) {
        if (competition.startTime <= now) {
          competition.status = CompetitionStatus.ON_GOING
          switch (competition.type) {
            case CompetitionType.ENDLESS:
              await this.endlessService.start(competition)
              break
            case CompetitionType.FMC_CHAIN:
              await this.chainService.start(competition)
              break
            case CompetitionType.LEAGUE:
              competition.status = await this.leagueService.calculateCompetitionStatus(competition)
              break

            default:
              break
          }
        }
      }
      await this.competitionsRepository.save(notStarteds)
    } catch (error) {
      this.logger.error(error)
    } finally {
      this.updating = false
    }
  }

  @Cron('* * * * *')
  async autoRevealEndlessChallengeConditions() {
    try {
      await this.endlessService.autoRevealConditions()
    } catch (error) {
      this.logger.error('Failed to auto-reveal endless challenge conditions', error)
    }
  }

  getLatest() {
    return this.competitionsRepository.find({
      take: 10,
      order: {
        id: 'DESC',
      },
    })
  }

  findOne(options: FindOneOptions<Competitions>) {
    return this.competitionsRepository.findOne(options)
  }

  findMany(options: FindManyOptions<Competitions>) {
    return this.competitionsRepository.find(options)
  }

  async getSubmissions(competition: Competitions, currentUser?: Users, hideSolutionsForUser = true) {
    const qb = this.submissionsRepository
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.user', 'u')
      .leftJoinAndSelect('s.attachments', 'a')
    const submissions = await Submissions.withActivityCounts(qb)
      .where('s.competition_id = :id', { id: competition.id })
      .orderBy('s.moves', 'ASC')
      .getMany()
    const mappedSubmissions: Record<number, Submissions[]> = {}
    const userSubmissions: Record<number, Submissions> = {}
    submissions.forEach(submission => {
      if (!mappedSubmissions[submission.scrambleId]) {
        mappedSubmissions[submission.scrambleId] = []
      }
      mappedSubmissions[submission.scrambleId].push(submission)
      if (currentUser) {
        if (submission.userId === currentUser.id) {
          userSubmissions[submission.scrambleId] = submission
        }
      }
    })
    if (hideSolutionsForUser) {
      submissions.forEach(submission => {
        if (userSubmissions[submission.scrambleId] || competition.hasEnded) {
          submission.hideSolution = false
        } else {
          submission.hideSolution = true
          submission.removeSolution()
        }
      })
    }
    if (currentUser) {
      await this.userService.loadUserActivities(currentUser, submissions)
    }
    return {
      submissions,
      mappedSubmissions,
    }
  }

  async createSubmission(
    competition: Competitions,
    scramble: Scrambles,
    user: Users,
    dto: SubmitSolutionDto,
    options?: {
      moves?: number
    },
  ) {
    const submission = new Submissions()
    submission.competition = competition
    submission.mode = dto.mode
    submission.scramble = scramble
    submission.user = user
    submission.solution = dto.solution
    submission.comment = dto.comment
    if (dto.attachments) {
      const attachments = await this.attachmentService.findByIds(dto.attachments)
      submission.attachments = attachments
    }
    if (typeof options?.moves === 'undefined') {
      submission.moves = calculateMoves(scramble.scramble, dto.solution)
    } else {
      submission.moves = options.moves
    }
    return submission
  }

  async updateUserSubmission(
    competition: Competitions,
    user: Users,
    id: number,
    newValues: Partial<SubmitSolutionDto>,
    allowKeys: (keyof Submissions)[] = ['comment', 'mode', 'attachments'],
  ) {
    const submission = await this.submissionsRepository.findOne({
      where: {
        id,
        userId: user.id,
        competitionId: competition.id,
      },
    })
    if (submission === null) {
      throw new BadRequestException('Invalid submission')
    }
    await this.updateSubmission(submission, newValues, allowKeys)
    return await this.submissionsRepository.save(submission)
  }

  async updateSubmission(
    submission: Submissions,
    newValues: Partial<SubmitSolutionDto | Submissions>,
    allowKeys: (keyof Submissions)[] = ['comment', 'mode', 'attachments'],
  ) {
    for (const key of allowKeys) {
      switch (key) {
        case 'solution':
        case 'comment':
          submission[key] = newValues[key]
          break
        case 'mode':
          submission[key] = newValues[key]
          break
        case 'attachments':
          if (typeof newValues.attachments[0] === 'number') {
            submission.attachments = await this.attachmentService.findByIds(newValues.attachments as number[])
          } else {
            submission.attachments = newValues.attachments as Attachments[]
          }
      }
    }
  }

  async getResults(competition: Competitions, where?: FindManyOptions<Results>['where']) {
    const results = await this.resultsRepository.find({
      where: {
        competitionId: competition.id,
        ...where,
      },
      order: {
        rank: 'ASC',
        average: 'ASC',
        best: 'ASC',
      },
      relations: {
        user: true,
      },
    })
    return results
  }
}
