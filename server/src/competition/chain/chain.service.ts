import { InjectQueue } from '@nestjs/bull'
import { BadRequestException, Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Queue } from 'bull'
import { In, IsNull, Repository, TreeRepository } from 'typeorm'

import { SubmitSolutionDto } from '@/dtos/submit-solution.dto'
import { Competitions, CompetitionStatus, CompetitionType } from '@/entities/competitions.entity'
import { Results } from '@/entities/results.entity'
import { Scrambles } from '@/entities/scrambles.entity'
import { SubmissionPhase, Submissions } from '@/entities/submissions.entity'
import { Users } from '@/entities/users.entity'
import { calculatePhases } from '@/utils'
import { generateScramble } from '@/utils/scramble'

import { CompetitionService } from '../competition.service'

export interface ChainJob {
  scrambleId: number
  submissionId: number
  userId: number
}

@Injectable()
export class ChainService {
  constructor(
    @InjectRepository(Scrambles)
    private readonly scramblesRepository: Repository<Scrambles>,
    @InjectRepository(Submissions)
    private readonly submissionsRepository: TreeRepository<Submissions>,
    @InjectRepository(Results)
    private readonly resultsRepository: Repository<Results>,
    private readonly competitionService: CompetitionService,
    @InjectQueue('chain')
    private readonly queue: Queue<ChainJob>,
  ) {}

  get() {
    return this.competitionService.findOne({
      where: {
        type: CompetitionType.FMC_CHAIN,
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

  getSubmission(competition: Competitions, scramble: Scrambles, id: number) {
    return this.submissionsRepository.findOne({
      where: {
        id,
        competitionId: competition.id,
        scrambleId: scramble.id,
      },
    })
  }

  getTree(submission: Submissions) {
    return this.submissionsRepository.findAncestorsTree(submission, {
      relations: ['user'],
    })
  }

  async getSubmissionsByPhase(competition: Competitions, scramble: Scrambles, phase: SubmissionPhase, user?: Users) {
    const submissions = await this.submissionsRepository.find({
      where: {
        competitionId: competition.id,
        scrambleId: scramble.id,
        phase,
      },
      relations: ['user'],
    })
    return await this.handleSubmissions(submissions, user)
  }

  async getSubmissions(competition: Competitions, scramble: Scrambles, parent: Submissions | null, user?: Users) {
    const qb = this.submissionsRepository.createQueryBuilder('s').leftJoinAndSelect('s.user', 'u')
    const queryBuilder = Submissions.withActivityCounts(qb)
      .where('s.competition_id = :competitionId and s.scramble_id = :scrambleId', {
        competitionId: competition.id,
        scrambleId: scramble.id,
      })
      .orderBy('s.cumulative_moves', 'ASC')
    if (parent) {
      queryBuilder.andWhere('s.parent_id = :parentId', { parentId: parent.id })
    } else {
      queryBuilder.andWhere('s.parent_id IS NULL')
    }
    const submissions = await queryBuilder.getMany()
    return await this.handleSubmissions(submissions, user)
  }

  async handleSubmissions(submissions: Submissions[], user?: Users) {
    let latestSubmission: Submissions | null = null
    let latestSubmittedDate: Date | null = null
    await Promise.all(
      submissions.map(async submission => {
        if (user?.id === submission.userId && (!latestSubmittedDate || submission.createdAt > latestSubmittedDate)) {
          latestSubmission = submission
          latestSubmittedDate = submission.createdAt
        }
        const decsendants = await this.submissionsRepository.findDescendants(submission)
        submission.finishes = 0
        let best = 0
        for (const descendant of decsendants) {
          if (descendant.id === submission.id) {
            continue
          }
          if ([SubmissionPhase.FINISHED, SubmissionPhase.INSERTIONS].includes(descendant.phase)) {
            submission.finishes++
            if (best === 0 || descendant.cumulativeMoves < best) {
              best = descendant.cumulativeMoves
            }
          }
          if (user?.id === descendant.userId && (!latestSubmittedDate || descendant.createdAt > latestSubmittedDate)) {
            latestSubmission = submission
            latestSubmittedDate = descendant.createdAt
          }
          submission.updatedAt =
            descendant.updatedAt > submission.updatedAt ? descendant.updatedAt : submission.updatedAt
        }
        submission.best = best
        submission.continuances = decsendants.length - 1
      }),
    )
    if (latestSubmission) {
      latestSubmission.latestSubmitted = true
    }
    return submissions
  }

  async getStats(competition: Competitions, scramble: Scrambles) {
    const top10 = await this.getTopN(competition, scramble, 10)
    const phaseCount = await this.submissionsRepository
      .createQueryBuilder()
      .select(['phase', 'count(*) as count', 'count(distinct user_id) as competitors'])
      .where('competition_id = :competitionId and scramble_id = :scrambleId', {
        competitionId: competition.id,
        scrambleId: scramble.id,
      })
      .groupBy('phase')
      .getRawMany<{
        phase: SubmissionPhase
        count: string
        competitors: string
      }>()
    const { competitors } = await this.submissionsRepository
      .createQueryBuilder()
      .select('count(distinct user_id)', 'competitors')
      .where('competition_id = :competitionId and scramble_id = :scrambleId', {
        competitionId: competition.id,
        scrambleId: scramble.id,
      })
      .getRawOne<{ competitors: string }>()
    const total = phaseCount.reduce((acc, cur) => acc + parseInt(cur.count), 0)
    return {
      top10,
      phaseCount,
      competitors,
      total,
    }
  }

  async getTopN(competition: Competitions, scramble: Scrambles, n: number) {
    const submissions = await this.submissionsRepository.find({
      where: {
        competitionId: competition.id,
        scrambleId: scramble.id,
        phase: In([SubmissionPhase.FINISHED, SubmissionPhase.INSERTIONS]),
      },
      order: {
        cumulativeMoves: 'ASC',
      },
      take: n,
      relations: {
        user: true,
      },
    })
    return Promise.all(submissions.map(submission => this.getTree(submission)))
  }

  async submitSolution(competition: Competitions, user: Users, dto: SubmitSolutionDto) {
    if (competition.hasEnded) {
      throw new BadRequestException('Competition has ended')
    }
    const scramble = await this.scramblesRepository.findOne({
      where: {
        id: dto.scrambleId,
        competitionId: competition.id,
      },
    })
    if (scramble === null) {
      throw new BadRequestException('Invalid scramble')
    }
    let parent: Submissions | null = null
    if (dto.parentId) {
      parent = await this.submissionsRepository.findOne({
        where: {
          id: dto.parentId,
          competitionId: competition.id,
          scrambleId: scramble.id,
        },
      })
      if (parent === null) {
        throw new BadRequestException('Invalid parent')
      }
      parent = await this.submissionsRepository.findAncestorsTree(parent)
      if (parent === null) {
        throw new BadRequestException('Invalid parent')
      }
    }
    const { phase, solution, moves, cancelMoves, cumulativeMoves } = calculatePhases(scramble.scramble, dto, parent)
    // check moves
    if (moves === 0 || dto.solution.toUpperCase().includes('NISS')) {
      throw new BadRequestException('Invalid solution')
    }
    const submission = await this.competitionService.createSubmission(competition, scramble, user, dto, {
      moves,
    })
    switch (phase) {
      case SubmissionPhase.SCRAMBLED:
        throw new BadRequestException('Invalid solution')
      case SubmissionPhase.EO:
      case SubmissionPhase.DR:
      case SubmissionPhase.HTR:
      case SubmissionPhase.SKELETON:
        if (
          parent &&
          (phase <= parent.phase || parent.phase === SubmissionPhase.FINISHED) &&
          !(phase === SubmissionPhase.HTR && parent.phase === SubmissionPhase.SKELETON)
        ) {
          throw new BadRequestException('Invalid solution')
        }
        submission.phase = phase
        break
      case SubmissionPhase.FINISHED:
      case SubmissionPhase.INSERTIONS:
        submission.phase = phase
        break
    }
    // check duplicate
    const duplicate = await this.submissionsRepository.findOne({
      where: {
        competitionId: competition.id,
        scrambleId: scramble.id,
        solution,
        parentId: parent ? parent.id : IsNull(),
      },
    })
    if (duplicate) {
      throw new BadRequestException('Duplicate solution')
    }
    submission.parent = parent
    submission.insertions = dto.insertions ?? null
    submission.inverse = dto.inverse
    submission.cancelMoves = cancelMoves
    submission.cumulativeMoves = cumulativeMoves
    await this.submissionsRepository.save(submission)
    await this.queue.add({
      scrambleId: scramble.id,
      submissionId: submission.id,
      userId: user.id,
    })
    return submission
  }

  async start(competition: Competitions) {
    const scramble = new Scrambles()
    scramble.competition = competition
    scramble.number = 1
    scramble.scramble = generateScramble()
    await this.scramblesRepository.save(scramble)
  }
}
