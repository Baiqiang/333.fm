import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { parseSearchQuery, type SearchTerm } from '@333fm/utils'
import { Algorithm } from 'insertionfinder'
import { paginate } from 'nestjs-typeorm-paginate'
import { Brackets, Repository, SelectQueryBuilder } from 'typeorm'

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

  private applyLikeTerms(qb: SelectQueryBuilder<any>, terms: SearchTerm[], fields: string[]) {
    terms.forEach((term, i) => {
      const param = `t${i}like`
      qb.andWhere(new Brackets(sub => {
        fields.forEach((field, fi) => {
          if (fi === 0)
            sub.where(`${field} LIKE :${param}`, { [param]: `%${term.value}%` })
          else
            sub.orWhere(`${field} LIKE :${param}`, { [param]: `%${term.value}%` })
        })
      }))
    })
  }

  private applySubmissionTerms(qb: SelectQueryBuilder<Submissions>, terms: SearchTerm[]) {
    terms.forEach((term, i) => {
      const prefix = `t${i}`
      qb.andWhere(new Brackets(sub => {
        if (!term.exact) {
          let q = replaceQuote(term.value)
          let isNotation = false
          try {
            new Algorithm(q)
            isNotation = true
            if (q.endsWith("'"))
              q = q.slice(0, -1)
          }
          catch {}
          if (isNotation) {
            const notations: string[] = []
            for (const rotation of rotationString)
              notations.push(formatAlgorithm(`${rotation} ${q}`))
            const param = `${prefix}regexp`
            sub.where(`(s.solution REGEXP :${param} OR s.comment REGEXP :${param})`, {
              [param]: `(${notations.join('|')})\\b`,
            })
            return
          }
        }
        const param = `${prefix}like`
        sub.where(`(s.solution LIKE :${param} OR s.comment LIKE :${param})`, {
          [param]: `%${term.value}%`,
        })
      }))
    })
  }

  async searchAll(dto: SearchDto) {
    const terms = parseSearchQuery(dto.q ?? '')
    if (terms.length === 0) {
      return { users: [], submissions: [], scrambles: [], competitions: [] }
    }

    const limit = dto.limit ?? 5

    const [users, submissions, scrambles, competitions] = await Promise.all([
      (() => {
        const qb = this.usersRepository
          .createQueryBuilder('u')
          .where('u.source != :merged', { merged: 'MERGED' })
        this.applyLikeTerms(qb, terms, ['u.name', 'u.wca_id'])
        return qb.orderBy('u.name', 'ASC').take(limit).getMany()
      })(),

      (() => {
        const qb = this.submissionBaseQuery()
        this.applyLikeTerms(qb, terms, ['s.solution', 's.comment'])
        return qb.orderBy('s.moves', 'ASC').take(limit).getMany()
      })(),

      (() => {
        const qb = this.scramblesRepository
          .createQueryBuilder('sc')
          .leftJoinAndSelect('sc.competition', 'c')
        this.applyLikeTerms(qb, terms, ['sc.scramble'])
        return qb.orderBy('sc.createdAt', 'DESC').take(limit).getMany()
      })(),

      (() => {
        const qb = this.competitionsRepository
          .createQueryBuilder('c')
          .leftJoinAndSelect('c.user', 'u')
        this.applyLikeTerms(qb, terms, ['c.name'])
        return qb.orderBy('c.startTime', 'DESC').take(limit).getMany()
      })(),
    ])

    return { users, submissions, scrambles, competitions }
  }

  async searchSubmissions(dto: SearchSubmissionsDto) {
    const qb = this.submissionBaseQuery()

    const terms = parseSearchQuery(dto.q ?? '')
    if (terms.length > 0)
      this.applySubmissionTerms(qb, terms)
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

    const terms = parseSearchQuery(dto.q ?? '')
    if (terms.length > 0)
      this.applyLikeTerms(qb, terms, ['sc.scramble'])
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

    const terms = parseSearchQuery(dto.q ?? '')
    if (terms.length > 0)
      this.applyLikeTerms(qb, terms, ['c.name'])
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
