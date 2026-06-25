import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Algorithm } from 'insertionfinder'
import { paginate } from 'nestjs-typeorm-paginate'
import { Brackets, Repository } from 'typeorm'

import { Competitions, CompetitionStatus, CompetitionSubType, CompetitionType } from '@/entities/competitions.entity'
import { Scrambles } from '@/entities/scrambles.entity'
import { Submissions } from '@/entities/submissions.entity'
import { Users } from '@/entities/users.entity'
import { formatAlgorithm, replaceQuote, rotationString } from '@/utils'

import { SearchCompetitionsDto, SearchDto, SearchScramblesDto, SearchSubmissionsDto } from './search.dto'

const excludedTypes = [CompetitionType.FMC_CHAIN, CompetitionType.ENDLESS]
const excludedSubTypes = [
  CompetitionSubType.EO_PRACTICE,
  CompetitionSubType.DR_PRACTICE,
  CompetitionSubType.HTR_PRACTICE,
  CompetitionSubType.JZP_PRACTICE,
]

@Injectable()
export class SearchService {
  constructor(
    @InjectRepository(Users)
    private readonly usersRepository: Repository<Users>,
    @InjectRepository(Submissions)
    private readonly submissionsRepository: Repository<Submissions>,
    @InjectRepository(Scrambles)
    private readonly scramblesRepository: Repository<Scrambles>,
    @InjectRepository(Competitions)
    private readonly competitionsRepository: Repository<Competitions>,
  ) {}

  private submissionBaseQuery() {
    const qb = this.submissionsRepository
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.user', 'u')
      .leftJoinAndSelect('s.scramble', 'sc')
      .leftJoinAndSelect('s.competition', 'c')
      .leftJoinAndSelect('c.user', 'cUser')
      .where('s.moves > 0')
      .andWhere('c.type NOT IN (:...excludedTypes)', { excludedTypes })
      .andWhere('c.sub_type NOT IN (:...excludedSubTypes)', { excludedSubTypes })
      .andWhere(
        new Brackets(qb => {
          qb.where('c.status = :ended', { ended: CompetitionStatus.ENDED }).orWhere('c.type = :practice', {
            practice: CompetitionType.PERSONAL_PRACTICE,
          })
        }),
      )
    return Submissions.withActivityCounts(qb)
  }

  async searchAll(dto: SearchDto) {
    const q = dto.q?.trim()
    if (!q) {
      return { users: [], submissions: [], scrambles: [], competitions: [] }
    }

    const limit = dto.limit ?? 5
    const like = `%${q}%`

    const [users, submissions, scrambles, competitions] = await Promise.all([
      this.usersRepository
        .createQueryBuilder('u')
        .where('u.source != :merged', { merged: 'MERGED' })
        .andWhere('(u.name LIKE :like OR u.wca_id LIKE :like)', { like })
        .orderBy('u.name', 'ASC')
        .take(limit)
        .getMany(),

      this.submissionBaseQuery()
        .andWhere('(s.solution LIKE :like OR s.comment LIKE :like)', { like })
        .orderBy('s.moves', 'ASC')
        .take(limit)
        .getMany(),

      this.scramblesRepository
        .createQueryBuilder('sc')
        .leftJoinAndSelect('sc.competition', 'c')
        .where('sc.scramble LIKE :like', { like })
        .orderBy('sc.createdAt', 'DESC')
        .take(limit)
        .getMany(),

      this.competitionsRepository
        .createQueryBuilder('c')
        .leftJoinAndSelect('c.user', 'u')
        .where('c.name LIKE :like', { like })
        .orderBy('c.startTime', 'DESC')
        .take(limit)
        .getMany(),
    ])

    return { users, submissions, scrambles, competitions }
  }

  async searchSubmissions(dto: SearchSubmissionsDto) {
    const qb = this.submissionBaseQuery()

    if (dto.q?.trim()) {
      let q = replaceQuote(dto.q.trim())
      let isNotation = false
      try {
        new Algorithm(q)
        isNotation = true
        if (q.endsWith("'")) {
          q = q.slice(0, -1)
        }
      } catch {}
      if (isNotation) {
        const notations: string[] = []
        for (const rotation of rotationString) {
          notations.push(formatAlgorithm(`${rotation} ${q}`))
        }
        qb.andWhere('(s.solution REGEXP :regexp OR s.comment REGEXP :regexp)', {
          regexp: `(${notations.join('|')})\\b`,
        })
      } else {
        qb.andWhere('(s.solution LIKE :like OR s.comment LIKE :like)', { like: `%${dto.q.trim()}%` })
      }
    }
    if (dto.minMoves !== undefined) {
      qb.andWhere('s.moves >= :minMoves', { minMoves: dto.minMoves })
    }
    if (dto.maxMoves !== undefined) {
      qb.andWhere('s.moves <= :maxMoves', { maxMoves: dto.maxMoves })
    }
    if (dto.startDate) {
      qb.andWhere('s.created_at >= :startDate', { startDate: dto.startDate })
    }
    if (dto.endDate) {
      qb.andWhere('s.created_at <= :endDate', { endDate: `${dto.endDate} 23:59:59` })
    }

    const sortBy = dto.sortBy === 'moves' ? 's.moves' : 's.created_at'
    const sortOrder = dto.sortOrder === 'ASC' ? 'ASC' : 'DESC'
    qb.orderBy(sortBy, sortOrder)
    if (dto.sortBy === 'moves') {
      qb.addOrderBy('s.created_at', 'DESC')
    }

    return paginate(qb, { page: dto.page, limit: dto.limit })
  }

  async searchScrambles(dto: SearchScramblesDto) {
    const qb = this.scramblesRepository.createQueryBuilder('sc').leftJoinAndSelect('sc.competition', 'c')

    if (dto.q?.trim()) {
      qb.where('sc.scramble LIKE :like', { like: `%${dto.q.trim()}%` })
    }
    if (dto.startDate) {
      qb.andWhere('sc.created_at >= :startDate', { startDate: dto.startDate })
    }
    if (dto.endDate) {
      qb.andWhere('sc.created_at <= :endDate', { endDate: `${dto.endDate} 23:59:59` })
    }

    qb.orderBy('sc.createdAt', 'DESC')

    return paginate(qb, { page: dto.page, limit: dto.limit })
  }

  async searchCompetitions(dto: SearchCompetitionsDto) {
    const qb = this.competitionsRepository.createQueryBuilder('c').leftJoinAndSelect('c.user', 'u')

    if (dto.q?.trim()) {
      qb.where('c.name LIKE :like', { like: `%${dto.q.trim()}%` })
    }
    if (dto.type !== undefined) {
      qb.andWhere('c.type = :type', { type: dto.type })
    }
    if (dto.startDate) {
      qb.andWhere('c.start_time >= :startDate', { startDate: dto.startDate })
    }
    if (dto.endDate) {
      qb.andWhere('c.start_time <= :endDate', { endDate: `${dto.endDate} 23:59:59` })
    }

    qb.orderBy('c.start_time', 'DESC')

    return paginate(qb, { page: dto.page, limit: dto.limit })
  }
}
