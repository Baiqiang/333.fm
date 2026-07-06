import {
  calculateSolutionScore,
  type CompetitionSubType as SharedCompetitionSubType,
  funChallengeLabel,
  funChallengeMetric,
  funChallengeSlug,
  isCenterSolvedChallenge,
  isFunChallengeSubType,
} from '@333fm/utils'
import { BadRequestException, forwardRef, Inject, Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import dayjs from 'dayjs'
import { IPaginationOptions, paginate, Pagination } from 'nestjs-typeorm-paginate'
import { Between, LessThan, Like, MoreThan, Repository } from 'typeorm'

import { CreateFunChallengeDto } from '@/dtos/create-fun-challenge.dto'
import { SubmitSolutionDto } from '@/dtos/submit-solution.dto'
import {
  CompetitionFormat,
  CompetitionMode,
  Competitions,
  CompetitionStatus,
  CompetitionSubType,
  CompetitionType,
} from '@/entities/competitions.entity'
import { Results } from '@/entities/results.entity'
import { Scrambles } from '@/entities/scrambles.entity'
import { Submissions } from '@/entities/submissions.entity'
import { Users } from '@/entities/users.entity'
import { generateScrambles } from '@/utils/scramble'

import { CompetitionService } from '../competition.service'
import { WeeklyService } from '../weekly/weekly.service'

const FUN_CHALLENGE_SUB_TYPES = [
  CompetitionSubType.QTM_CHALLENGE,
  CompetitionSubType.STM_CHALLENGE,
  CompetitionSubType.ATM_CHALLENGE,
  CompetitionSubType.CENTER_SOLVED_CHALLENGE,
]

@Injectable()
export class FunChallengeService {
  constructor(
    @InjectRepository(Competitions)
    private readonly competitionsRepository: Repository<Competitions>,
    @InjectRepository(Scrambles)
    private readonly scramblesRepository: Repository<Scrambles>,
    @InjectRepository(Submissions)
    private readonly submissionsRepository: Repository<Submissions>,
    @InjectRepository(Results)
    private readonly resultsRepository: Repository<Results>,
    @Inject(forwardRef(() => CompetitionService))
    private readonly competitionService: CompetitionService,
    private readonly weeklyService: WeeklyService,
  ) {}

  getOnGoing() {
    return this.competitionService.findOne({
      where: {
        type: CompetitionType.FUN_CHALLENGE,
        status: CompetitionStatus.ON_GOING,
      },
      relations: {
        scrambles: true,
      },
      order: {
        id: 'DESC',
      },
    })
  }

  async getCompetitions(options: IPaginationOptions): Promise<Pagination<Competitions>> {
    const data = await paginate<Competitions>(this.competitionsRepository, options, {
      where: {
        type: CompetitionType.FUN_CHALLENGE,
        status: CompetitionStatus.ENDED,
      },
      order: {
        createdAt: 'DESC',
      },
    })
    await Promise.all(
      data.items.map(async competition => {
        competition.winners = await this.resultsRepository.find({
          where: {
            competitionId: competition.id,
            mode: CompetitionMode.REGULAR,
            rank: 1,
          },
          relations: {
            user: true,
          },
        })
      }),
    )
    return data
  }

  getAdminCompetitions() {
    return this.competitionsRepository.find({
      where: {
        type: CompetitionType.FUN_CHALLENGE,
      },
      relations: {
        scrambles: true,
      },
      order: {
        createdAt: 'DESC',
      },
      take: 50,
    })
  }

  async getCompetition(alias: string) {
    const competition = await this.competitionService.findOne({
      where: {
        type: CompetitionType.FUN_CHALLENGE,
        alias,
      },
      relations: {
        scrambles: true,
        user: true,
      },
    })
    if (competition) {
      competition.nextCompetition = await this.competitionService.findOne({
        where: {
          type: CompetitionType.FUN_CHALLENGE,
          startTime: MoreThan(competition.startTime),
        },
        order: {
          startTime: 'ASC',
        },
      })
      competition.prevCompetition = await this.competitionService.findOne({
        where: {
          type: CompetitionType.FUN_CHALLENGE,
          startTime: LessThan(competition.startTime),
        },
        order: {
          startTime: 'DESC',
        },
      })
    }
    return competition
  }

  async create(dto: CreateFunChallengeDto, user: Users) {
    if (!FUN_CHALLENGE_SUB_TYPES.includes(dto.subType) || !isFunChallengeSubType(dto.subType)) {
      throw new BadRequestException('Invalid fun challenge type')
    }
    const scrambleCount = this.scrambleCount(dto.format)
    const startTime = new Date(dto.startTime)
    const endTime = new Date(dto.endTime)
    if (Number.isNaN(startTime.getTime()) || Number.isNaN(endTime.getTime())) {
      throw new BadRequestException('Invalid start or end time')
    }
    if (endTime <= startTime) {
      throw new BadRequestException('endTime must be later than startTime')
    }
    if (dto.scrambles && dto.scrambles.length !== scrambleCount) {
      throw new BadRequestException(`Expected ${scrambleCount} scrambles`)
    }

    const date = dayjs(startTime).format('YYYY-MM-DD')
    const subType = dto.subType as unknown as SharedCompetitionSubType
    const slug = funChallengeSlug(subType)
    const sequence = await this.nextSequence(slug, date)
    const competition = new Competitions()
    competition.alias = `${slug}-${date}-${sequence}`
    competition.name = `${funChallengeLabel(subType)} ${date} #${sequence}`
    competition.type = CompetitionType.FUN_CHALLENGE
    competition.subType = dto.subType
    competition.format = dto.format
    competition.userId = user.id
    competition.startTime = startTime
    competition.endTime = endTime
    competition.status = startTime <= new Date() ? CompetitionStatus.ON_GOING : CompetitionStatus.NOT_STARTED
    await this.competitionsRepository.save(competition)

    const scrambleStrings = dto.scrambles?.length ? dto.scrambles : generateScrambles(scrambleCount)
    const scrambles = scrambleStrings.map((scrambleString, index) => {
      const scramble = new Scrambles()
      scramble.number = index + 1
      scramble.scramble = scrambleString
      scramble.competitionId = competition.id
      return scramble
    })
    await this.scramblesRepository.save(scrambles)
    competition.scrambles = scrambles
    return competition
  }

  async start(alias: string) {
    const competition = await this.requireCompetition(alias)
    if (competition.status === CompetitionStatus.ENDED) {
      throw new BadRequestException('Competition has ended')
    }
    competition.status = CompetitionStatus.ON_GOING
    competition.startTime = new Date()
    return this.competitionsRepository.save(competition)
  }

  async end(alias: string) {
    const competition = await this.requireCompetition(alias)
    if (competition.status === CompetitionStatus.ENDED) {
      return competition
    }
    competition.status = CompetitionStatus.ENDED
    competition.endTime = new Date()
    await this.weeklyService.calculateResults(competition)
    return this.competitionsRepository.save(competition)
  }

  async delete(alias: string) {
    const competition = await this.requireCompetition(alias)
    const submissions = await this.submissionsRepository.countBy({
      competitionId: competition.id,
    })
    if (competition.hasStarted || submissions > 0) {
      throw new BadRequestException('Only not-started competitions without submissions can be deleted')
    }
    await this.competitionsRepository.remove(competition)
    return true
  }

  submitSolution(competition: Competitions, user: Users, solution: SubmitSolutionDto) {
    return this.weeklyService.submitSolution(competition, user, solution, scramble =>
      this.scoreSolution(competition, scramble, solution),
    )
  }

  update(
    competition: Competitions,
    user: Users,
    id: number,
    solution: Pick<SubmitSolutionDto, 'comment' | 'attachments'>,
  ) {
    return this.weeklyService.update(competition, user, id, solution)
  }

  turnToUnlimited(competition: Competitions, user: Users, id: number) {
    return this.weeklyService.turnToUnlimited(competition, user, id)
  }

  private async requireCompetition(alias: string) {
    const competition = await this.getCompetition(alias)
    if (!competition) {
      throw new NotFoundException('Competition not found')
    }
    return competition
  }

  private async nextSequence(slug: string, date: string) {
    const prefix = `${slug}-${date}`
    const dayStart = dayjs(date).startOf('day').toDate()
    const dayEnd = dayjs(date).endOf('day').toDate()
    const count = await this.competitionsRepository.count({
      where: {
        type: CompetitionType.FUN_CHALLENGE,
        alias: Like(`${prefix}-%`),
        startTime: Between(dayStart, dayEnd),
      },
    })
    return count + 1
  }

  private scrambleCount(format: CompetitionFormat) {
    switch (format) {
      case CompetitionFormat.BO1:
        return 1
      case CompetitionFormat.MO3:
        return 3
      default:
        throw new BadRequestException('Fun Challenges only support BO1 or MO3')
    }
  }

  private scoreSolution(competition: Competitions, scramble: Scrambles, solution: SubmitSolutionDto) {
    const subType = competition.subType as unknown as SharedCompetitionSubType
    const requireCentersRestored = isCenterSolvedChallenge(subType)
    const score = calculateSolutionScore(scramble.scramble, solution.solution, funChallengeMetric(subType), {
      requireCentersRestored,
    })
    if (requireCentersRestored && score.solved && !score.centersRestored) {
      throw new BadRequestException('Centers are not restored')
    }
    return score.moves
  }
}
