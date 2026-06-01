import { forwardRef, Inject, Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import dayjs from 'dayjs'
import { IPaginationOptions, paginate, Pagination } from 'nestjs-typeorm-paginate'
import { LessThan, MoreThan, Repository } from 'typeorm'

import {
  CompetitionFormat,
  CompetitionMode,
  Competitions,
  CompetitionStatus,
  CompetitionType,
} from '@/entities/competitions.entity'
import { Results } from '@/entities/results.entity'
import { Scrambles } from '@/entities/scrambles.entity'
import { Submissions } from '@/entities/submissions.entity'
import { Users } from '@/entities/users.entity'
import { compNow } from '@/utils'
import { generateScramble } from '@/utils/scramble'

import { CompetitionService } from '../competition.service'
import { WeeklyService } from '../weekly/weekly.service'

@Injectable()
export class DailyService {
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

  async generateCompetition(user: Users): Promise<Competitions | null> {
    const competition = new Competitions()
    const startTime = compNow()
    const alias = startTime.format('YYYY-MM-DD')
    const count = await this.competitionsRepository.countBy({
      type: CompetitionType.DAILY,
      alias,
    })
    if (count > 0) {
      return null
    }
    competition.name = `Daily ${alias}`
    competition.alias = alias
    competition.startTime = startTime.toDate()
    competition.endTime = startTime.hour(0).minute(0).second(0).millisecond(0).add(1, 'day').toDate()
    competition.type = CompetitionType.DAILY
    competition.format = CompetitionFormat.BO1
    competition.userId = user.id
    competition.status = CompetitionStatus.ON_GOING
    await this.competitionsRepository.save(competition)
    const scramble = new Scrambles()
    scramble.number = 1
    scramble.scramble = generateScramble()
    scramble.competitionId = competition.id
    await this.scramblesRepository.save(scramble)
    competition.scrambles = [scramble]
    return competition
  }

  getOnGoing() {
    return this.competitionService.findOne({
      where: {
        type: CompetitionType.DAILY,
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
        type: CompetitionType.DAILY,
        status: CompetitionStatus.ENDED,
      },
      order: {
        createdAt: 'DESC',
      },
    })
    await Promise.all(
      data.items.map(async competition => {
        const winners = await this.resultsRepository.find({
          where: {
            competitionId: competition.id,
            mode: CompetitionMode.REGULAR,
            rank: 1,
          },
          relations: {
            user: true,
          },
        })
        competition.winners = winners
      }),
    )
    return data
  }

  async getCompetition(alias: string) {
    const competition = await this.competitionService.findOne({
      where: {
        type: CompetitionType.DAILY,
        alias,
      },
      relations: {
        scrambles: true,
        user: true,
      },
    })
    if (competition) {
      const date = dayjs(competition.startTime)
      const nextCompetition = await this.competitionService.findOne({
        where: {
          type: CompetitionType.DAILY,
          startTime: MoreThan(date.toDate()),
        },
        order: {
          startTime: 'ASC',
        },
      })
      competition.nextCompetition = nextCompetition
      const prevCompetition = await this.competitionService.findOne({
        where: {
          type: CompetitionType.DAILY,
          startTime: LessThan(date.toDate()),
        },
        order: {
          startTime: 'DESC',
        },
      })
      competition.prevCompetition = prevCompetition
    }
    return competition
  }
}
