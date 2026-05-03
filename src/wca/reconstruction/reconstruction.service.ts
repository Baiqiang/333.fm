import { HttpService } from '@nestjs/axios'
import { InjectQueue } from '@nestjs/bull'
import { BadRequestException, Injectable, Logger } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'
import { InjectRepository } from '@nestjs/typeorm'
import { Queue } from 'bull'
import { IPaginationOptions, paginate } from 'nestjs-typeorm-paginate'
import { firstValueFrom } from 'rxjs'
import { Repository } from 'typeorm'

import { AttachmentService } from '@/attachment/attachment.service'
import { CompetitionService } from '@/competition/competition.service'
import { SubmitWcaReconstructionDto, UpdateWcaReconstructionDescriptionDto } from '@/dtos/wca-reconstruction.dto'
import {
  CompetitionFormat,
  CompetitionMode,
  Competitions,
  CompetitionStatus,
  CompetitionType,
} from '@/entities/competitions.entity'
import { DNF } from '@/entities/results.entity'
import { Scrambles } from '@/entities/scrambles.entity'
import { SubmissionPhase, Submissions } from '@/entities/submissions.entity'
import { Users } from '@/entities/users.entity'
import { type WcaOfficialRoundResult, WcaReconstructions } from '@/entities/wca-reconstructions.entity'
import { UserService } from '@/user/user.service'
import { calculateMoves, transformWCAMoves } from '@/utils'

const WCA_API_BASE = 'https://www.worldcubeassociation.org/api/v0'
const WCA_API_V1_BASE = 'https://www.worldcubeassociation.org/api/v1'
const WCA_LIVE_API = 'https://live.worldcubeassociation.org/api'

export const RECON_SYNC_QUEUE = 'wca-recon-sync'

export interface ReconSyncJobData {
  wcaCompetitionId: string
}

interface WcaApiResult {
  id: number
  pos: number
  best: number
  average: number
  name: string
  wca_id: string
  country_iso2: string
  competition_id: string
  event_id: string
  round_type_id: string
  format_id: string
  attempts: number[]
  regional_single_record: string | null
  regional_average_record: string | null
}

interface WcaApiScramble {
  event_id: string
  round_type_id: string
  group_id: string
  is_extra: boolean
  scramble_num: number
  scramble: string
}

interface WcaApiResultsResponse {
  rounds: Array<{
    roundTypeId: string
    results: WcaApiResult[]
  }>
}

interface WcaApiScramblesResponse {
  rounds: Array<{
    roundTypeId: string
    scrambles: WcaApiScramble[]
  }>
}

interface WcaApiV1Registration {
  id: number
  registrant_id: number
  user?: {
    wca_id: string | null
  }
  competing?: {
    event_ids?: string[]
  }
}

interface WcaApiV1RoundResult {
  registration_id?: number
  registrant_id?: number
  attempts?: Array<{
    attempt_number: number
    value: number
  }>
}

interface WcaApiV1RoundResponse {
  format?: string
  linked_round_ids?: string[]
  results?: WcaApiV1RoundResult[]
}

interface ParsedWcaResults {
  results: WcaApiResult[]
  roundMap: Map<string, number>
}

interface ParsedWcaScrambles {
  scrambles: WcaApiScramble[]
  roundMap: Map<string, number>
}

function formatIdToAttempts(formatId: string): number {
  switch (formatId) {
    case '1':
      return 1
    case '2':
      return 2
    case 'm':
      return 3
    default:
      return 3
  }
}

@Injectable()
export class WcaReconstructionService {
  private readonly logger = new Logger(WcaReconstructionService.name)

  constructor(
    @InjectRepository(Competitions)
    private readonly competitionsRepository: Repository<Competitions>,
    @InjectRepository(Scrambles)
    private readonly scramblesRepository: Repository<Scrambles>,
    @InjectRepository(Submissions)
    private readonly submissionsRepository: Repository<Submissions>,
    @InjectRepository(WcaReconstructions)
    private readonly reconstructionsRepository: Repository<WcaReconstructions>,
    @InjectRepository(Users)
    private readonly usersRepository: Repository<Users>,
    private readonly httpService: HttpService,
    private readonly attachmentService: AttachmentService,
    private readonly userService: UserService,
    private readonly competitionService: CompetitionService,
    @InjectQueue(RECON_SYNC_QUEUE)
    private readonly reconSyncQueue: Queue<ReconSyncJobData>,
  ) {}

  async submit(user: Users, dto: SubmitWcaReconstructionDto) {
    const { wcaCompetitionId, roundNumber, scrambleNumber, comment } = dto
    const solution = dto.solution?.trim() ?? ''
    const competition = await this.getOrCreateCompetition(wcaCompetitionId)

    let { scramble } = dto
    let scrambleRecord = await this.scramblesRepository.findOne({
      where: { competitionId: competition.id, roundNumber, number: scrambleNumber },
    })

    // check if scramble entered manually
    if (!scramble) {
      if (!scrambleRecord) {
        await this.syncScramblesFromWca(wcaCompetitionId)
        scrambleRecord = await this.scramblesRepository.findOne({
          where: { competitionId: competition.id, roundNumber, number: scrambleNumber },
        })
      }
      if (!scrambleRecord) {
        throw new BadRequestException('Scramble not available. Please provide the scramble manually.')
      }
      scramble = scrambleRecord.scramble
    }

    const moves = calculateMoves(scramble, solution)
    const isDNFSubmission = moves === DNF
    if (scrambleRecord) {
      if (!isDNFSubmission && scrambleRecord.verified && scrambleRecord.scramble !== scramble) {
        throw new BadRequestException('Scramble does not match the verified scramble')
      }
    } else {
      scrambleRecord = this.scramblesRepository.create({
        competitionId: competition.id,
        roundNumber,
        number: scrambleNumber,
        scramble,
        submittedById: user.id,
        verified: false,
      })
      await this.scramblesRepository.save(scrambleRecord)
    }

    const isParticipant = await this.isUserParticipant(wcaCompetitionId, user.wcaId)
    const officialResults = await this.getUserOfficialResults(wcaCompetitionId, user.wcaId)

    let reconstruction = await this.reconstructionsRepository.findOne({
      where: { competitionId: competition.id, userId: user.id },
    })
    const wcaData = { officialResults: officialResults.length > 0 ? officialResults : undefined }
    if (!reconstruction) {
      reconstruction = this.reconstructionsRepository.create({
        competitionId: competition.id,
        userId: user.id,
        isParticipant,
        wcaData,
      })
      await this.reconstructionsRepository.save(reconstruction)
    } else {
      let dirty = false
      if (reconstruction.isParticipant !== isParticipant) {
        reconstruction.isParticipant = isParticipant
        dirty = true
      }
      if (officialResults.length > 0) {
        reconstruction.wcaData = wcaData
        dirty = true
      }
      if (dirty) {
        await this.reconstructionsRepository.save(reconstruction)
      }
    }

    let submission = await this.submissionsRepository.findOne({
      where: { scrambleId: scrambleRecord.id, userId: user.id },
    })
    if (submission) {
      submission.solution = solution
      submission.comment = comment ?? ''
      submission.moves = moves
    } else {
      submission = this.submissionsRepository.create({
        competitionId: competition.id,
        scrambleId: scrambleRecord.id,
        userId: user.id,
        solution,
        comment: comment ?? '',
        moves,
        mode: CompetitionMode.REGULAR,
        phase: SubmissionPhase.FINISHED,
        inverse: false,
        cancelMoves: 0,
        verified: true,
      })
    }

    const wcaMoves = await this.getWcaMoves(wcaCompetitionId, user.wcaId, roundNumber, scrambleNumber)
    if (wcaMoves !== null) {
      submission.wcaMoves = wcaMoves
      if (!isDNFSubmission && wcaMoves !== DNF && moves !== wcaMoves) {
        this.logger.warn(
          `Moves mismatch for ${user.wcaId} at ${wcaCompetitionId} R${roundNumber}S${scrambleNumber}: recon=${moves} wca=${wcaMoves}`,
        )
      }
    }

    if (dto.attachments?.length) {
      submission.attachments = await this.attachmentService.findByIds(dto.attachments)
    } else if (dto.attachments) {
      submission.attachments = []
    }

    await this.submissionsRepository.save(submission)
    await this.tryVerifyScramble(scrambleRecord, wcaCompetitionId)

    return { reconstruction, submission, scramble: scrambleRecord }
  }

  async updateDescription(user: Users, wcaCompetitionId: string, dto: UpdateWcaReconstructionDescriptionDto) {
    const competition = await this.competitionsRepository.findOne({
      where: { wcaCompetitionId },
    })
    if (!competition) {
      throw new BadRequestException('Competition not found')
    }

    let reconstruction = await this.reconstructionsRepository.findOne({
      where: { competitionId: competition.id, userId: user.id },
    })
    if (!reconstruction) {
      const isParticipant = await this.isUserParticipant(wcaCompetitionId, user.wcaId)
      reconstruction = this.reconstructionsRepository.create({
        competitionId: competition.id,
        userId: user.id,
        description: dto.description,
        isParticipant,
      })
    } else {
      reconstruction.description = dto.description
    }
    await this.reconstructionsRepository.save(reconstruction)
    return reconstruction
  }

  async getLatestRecons(options: IPaginationOptions, sort: string = 'latest') {
    const qb = this.reconstructionsRepository
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.user', 'u')
      .leftJoinAndSelect('r.competition', 'c')
    if (sort === 'compDate') {
      qb.orderBy('c.startTime', 'DESC')
    } else {
      qb.orderBy('r.createdAt', 'DESC')
    }

    const result = await paginate(qb, options)
    const recons = result.items

    const countMap: Record<string, number> = {}
    if (recons.length > 0) {
      const submissionCounts = await this.submissionsRepository
        .createQueryBuilder('s')
        .select('s.competitionId', 'competitionId')
        .addSelect('s.userId', 'userId')
        .addSelect('COUNT(*)', 'count')
        .where('s.competitionId IN (:...ids)', { ids: [...new Set(recons.map(r => r.competitionId))] })
        .andWhere('s.userId IN (:...uids)', { uids: [...new Set(recons.map(r => r.userId))] })
        .groupBy('s.competitionId')
        .addGroupBy('s.userId')
        .getRawMany()
      for (const row of submissionCounts) {
        countMap[`${row.competitionId}-${row.userId}`] = Number(row.count)
      }
    }

    return {
      items: recons.map(r => ({
        id: r.id,
        user: r.user,
        wcaCompetitionId: r.competition?.wcaCompetitionId,
        competitionName: r.competition?.name,
        description: r.description,
        isParticipant: r.isParticipant,
        submissionCount: countMap[`${r.competitionId}-${r.userId}`] ?? 0,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        wcaData: r.wcaData,
        startTime: r.competition?.startTime,
      })),
      meta: result.meta,
    }
  }

  async getUserRecons(user: Users) {
    const recons = await this.reconstructionsRepository
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.competition', 'c')
      .where('r.userId = :userId', { userId: user.id })
      .orderBy('c.startTime', 'DESC')
      .getMany()

    const countMap: Record<number, number> = {}
    if (recons.length > 0) {
      const submissionCounts = await this.submissionsRepository
        .createQueryBuilder('s')
        .select('s.competitionId', 'competitionId')
        .addSelect('COUNT(*)', 'count')
        .where('s.competitionId IN (:...ids)', { ids: recons.map(r => r.competitionId) })
        .andWhere('s.userId = :userId', { userId: user.id })
        .groupBy('s.competitionId')
        .getRawMany()
      for (const row of submissionCounts) {
        countMap[Number(row.competitionId)] = Number(row.count)
      }
    }

    return recons.map(r => ({
      id: r.id,
      user: r.user,
      wcaCompetitionId: r.competition?.wcaCompetitionId,
      competitionName: r.competition?.name,
      description: r.description,
      isParticipant: r.isParticipant,
      submissionCount: countMap[r.competitionId] ?? 0,
      updatedAt: r.updatedAt,
      wcaData: r.wcaData,
      startTime: r.competition?.startTime,
    }))
  }

  async getUserReconForCompetition(wcaCompetitionId: string, targetUser: Users, currentUser?: Users) {
    const competition = await this.competitionsRepository.findOne({
      where: { wcaCompetitionId },
    })
    if (!competition) {
      return null
    }

    const recon = await this.reconstructionsRepository.findOne({
      where: { competitionId: competition.id, userId: targetUser.id },
      relations: { user: true },
    })
    if (!recon) {
      return null
    }

    const qb = this.submissionsRepository
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.scramble', 'sc')
      .leftJoinAndSelect('s.attachments', 'att')
    const submissions = await Submissions.withActivityCounts(qb)
      .where('s.competition_id = :cid', { cid: competition.id })
      .andWhere('s.user_id = :uid', { uid: targetUser.id })
      .orderBy('sc.round_number', 'ASC')
      .addOrderBy('sc.number', 'ASC')
      .getMany()

    if (currentUser) {
      await this.userService.loadUserActivities(currentUser, submissions)
    }

    let officialResults = recon.wcaData?.officialResults ?? []
    if (officialResults.length === 0 && targetUser.wcaId) {
      officialResults = await this.getUserOfficialResults(wcaCompetitionId, targetUser.wcaId)
      if (officialResults.length > 0) {
        recon.wcaData = { ...recon.wcaData, officialResults }
        await this.reconstructionsRepository.save(recon)
      }
    }

    return { recon, submissions, competition, officialResults }
  }

  async getCompetitionData(wcaCompetitionId: string, user?: Users) {
    const [officialResultsData, officialScramblesData] = await Promise.all([
      this.getWcaOfficialResults(wcaCompetitionId),
      this.getWcaOfficialScrambles(wcaCompetitionId),
    ])

    const isPublished = officialResultsData !== null
    const hasOfficialScrambles = officialScramblesData !== null

    const competition = await this.competitionsRepository.findOne({
      where: { wcaCompetitionId },
    })

    if (hasOfficialScrambles && competition) {
      await this.syncScramblesFromWca(wcaCompetitionId)
    }

    const recons = competition
      ? await this.reconstructionsRepository.find({
          where: { competitionId: competition.id },
          relations: { user: true },
          order: { createdAt: 'ASC' },
        })
      : []

    if (officialResultsData && recons.length > 0) {
      const { results, roundMap } = officialResultsData
      const toSave: WcaReconstructions[] = []
      for (const recon of recons) {
        const wcaId = recon.user?.wcaId
        if (!wcaId) continue
        let dirty = false
        const userResults = results
          .filter(r => r.wca_id === wcaId)
          .map(r => ({
            roundNumber: roundMap.get(r.round_type_id) ?? 1,
            roundTypeId: r.round_type_id,
            pos: r.pos,
            best: r.best,
            average: r.average,
            attempts: r.attempts,
            regionalSingleRecord: r.regional_single_record,
            regionalAverageRecord: r.regional_average_record,
          }))
        if (userResults.length > 0) {
          const wcaData = { ...recon.wcaData, officialResults: userResults }
          delete wcaData.officialNonParticipant
          delete wcaData.officialNonParticipantAt
          recon.wcaData = wcaData
          if (!recon.isParticipant) {
            recon.isParticipant = true
          }
          dirty = true
        } else if (!recon.wcaData?.officialNonParticipant) {
          recon.wcaData = {
            ...recon.wcaData,
            officialNonParticipant: true,
            officialNonParticipantAt: new Date().toISOString(),
          }
          dirty = true
        }
        if (dirty) {
          toSave.push(recon)
        }
      }
      if (toSave.length > 0) {
        await this.reconstructionsRepository.save(toSave)
      }
    }

    let scrambles: Scrambles[]
    let mappedSubmissions: Record<number, Submissions[]> = {}
    if (competition) {
      scrambles = await this.scramblesRepository.find({
        where: { competitionId: competition.id },
        order: { roundNumber: 'ASC', number: 'ASC' },
      })
      const tmp = await this.competitionService.getSubmissions(competition, user, false)
      mappedSubmissions = tmp.mappedSubmissions
    } else if (officialScramblesData) {
      const { scrambles: officialScrambles, roundMap } = officialScramblesData
      scrambles = officialScrambles
        .filter(s => !s.is_extra)
        .map((s, i) => {
          const record = new Scrambles()
          record.id = -(i + 1)
          record.roundNumber = roundMap.get(s.round_type_id) ?? 1
          record.number = s.scramble_num
          record.scramble = s.scramble
          record.verified = true
          record.competitionId = 0
          return record
        })
        .sort((a, b) => a.roundNumber - b.roundNumber || a.number - b.number)
    } else {
      scrambles = []
    }
    const attemptsPerRound: Record<number, number> = {}
    if (officialResultsData) {
      const { results, roundMap } = officialResultsData
      for (const result of results) {
        const rn = roundMap.get(result.round_type_id) ?? 1
        if (!attemptsPerRound[rn]) {
          attemptsPerRound[rn] = formatIdToAttempts(result.format_id)
        }
      }
    } else if (officialScramblesData) {
      const { scrambles: officialScrambles, roundMap } = officialScramblesData
      for (const s of officialScrambles.filter(s => !s.is_extra)) {
        const rn = roundMap.get(s.round_type_id) ?? 1
        attemptsPerRound[rn] = (attemptsPerRound[rn] ?? 0) + 1
      }
    }

    let liveInfo: { participantWcaIds: Set<string>; attemptsPerRound: Record<number, number> } | null = null
    if (!isPublished) {
      liveInfo = await this.getLiveCompetitionInfo(wcaCompetitionId)
      if (liveInfo) {
        for (const [rn, count] of Object.entries(liveInfo.attemptsPerRound)) {
          if (!attemptsPerRound[Number(rn)]) {
            attemptsPerRound[Number(rn)] = count
          }
        }
        if (recons.length > 0) {
          const toSave: WcaReconstructions[] = []
          for (const recon of recons) {
            const wcaId = recon.user?.wcaId
            if (!wcaId) continue
            const isLiveParticipant = liveInfo.participantWcaIds.has(wcaId)
            if (recon.isParticipant !== isLiveParticipant) {
              recon.isParticipant = isLiveParticipant
              toSave.push(recon)
            }
          }
          if (toSave.length > 0) {
            await this.reconstructionsRepository.save(toSave)
          }
        }
      }
    }

    if (Object.keys(attemptsPerRound).length === 0) {
      const wcifFormats = await this.getWcifAttemptsPerRound(wcaCompetitionId)
      if (wcifFormats) {
        Object.assign(attemptsPerRound, wcifFormats)
      }
    }

    let currentUser: { isParticipant: boolean; attempts: Record<string, number> } | null = null
    if (user?.wcaId) {
      const attempts: Record<string, number> = {}
      let isParticipant = false

      if (officialResultsData) {
        const { results, roundMap } = officialResultsData
        for (const result of results) {
          if (result.wca_id === user.wcaId) {
            isParticipant = true
            const rn = roundMap.get(result.round_type_id) ?? 1
            for (let i = 0; i < result.attempts.length; i++) {
              if (result.attempts[i] !== 0) {
                attempts[`${rn}-${i + 1}`] = result.attempts[i]
              }
            }
          }
        }
      }

      if (!isParticipant) {
        if (liveInfo?.participantWcaIds) {
          isParticipant = liveInfo.participantWcaIds.has(user.wcaId)
        }
        const liveData = await this.getLiveUserData(wcaCompetitionId, user.wcaId)
        if (liveData) {
          isParticipant = liveData.isParticipant
          Object.assign(attempts, liveData.attempts)
        }
      }

      currentUser = { isParticipant, attempts }
    }

    // queue
    if (scrambles.some(s => !s.verified) && isPublished) {
      await this.queueSyncWcaData(wcaCompetitionId)
    }

    return {
      competition,
      recons,
      scrambles,
      submissions: mappedSubmissions,
      isPublished,
      hasOfficialScrambles,
      attemptsPerRound,
      currentUser,
    }
  }

  async getScrambles(wcaCompetitionId: string) {
    const competition = await this.competitionsRepository.findOne({
      where: { wcaCompetitionId },
    })
    if (!competition) return []
    return this.scramblesRepository.find({
      where: { competitionId: competition.id },
      order: { roundNumber: 'ASC', number: 'ASC' },
    })
  }

  async syncScramblesFromWca(wcaCompetitionId: string) {
    const data = await this.getWcaOfficialScrambles(wcaCompetitionId)
    if (!data) return null

    const competition = await this.getOrCreateCompetition(wcaCompetitionId)

    const { scrambles: officialScrambles, roundMap } = data
    const fmScrambles = officialScrambles.filter(s => !s.is_extra)
    const synced: Scrambles[] = []
    let hasChanges = false

    for (const s of fmScrambles) {
      const roundNumber = roundMap.get(s.round_type_id) ?? 1
      const scrambleNumber = s.scramble_num

      let existing = await this.scramblesRepository.findOne({
        where: { competitionId: competition.id, roundNumber, number: scrambleNumber },
      })

      if (existing) {
        if (!existing.verified || existing.scramble !== s.scramble) {
          existing.scramble = s.scramble
          existing.verified = true
          await this.scramblesRepository.save(existing)
          hasChanges = true
        }
      } else {
        existing = this.scramblesRepository.create({
          competitionId: competition.id,
          roundNumber,
          number: scrambleNumber,
          scramble: s.scramble,
          verified: true,
        })
        await this.scramblesRepository.save(existing)
        hasChanges = true
      }
      synced.push(existing)
    }

    if (hasChanges) {
      await this.queueSyncWcaData(wcaCompetitionId)
    }

    return synced
  }

  async queueSyncWcaData(wcaCompetitionId: string) {
    await this.reconSyncQueue.add({ wcaCompetitionId }, { removeOnComplete: true, removeOnFail: 10 })
    this.logger.log(`Queued WCA data sync for ${wcaCompetitionId}`)
  }

  @Cron('0 * * * *')
  async syncUnresolvedNonParticipantRecons() {
    const recons = await this.reconstructionsRepository.find({
      where: { isParticipant: false },
      relations: { competition: true, user: true },
    })
    const groups = new Map<string, WcaReconstructions[]>()

    for (const recon of recons) {
      const wcaCompetitionId = recon.competition?.wcaCompetitionId
      if (!wcaCompetitionId || recon.competition.type !== CompetitionType.WCA_RECONSTRUCTION) continue
      if (recon.wcaData?.officialNonParticipant) continue

      const group = groups.get(wcaCompetitionId) ?? []
      group.push(recon)
      groups.set(wcaCompetitionId, group)
    }

    let synced = 0
    for (const [wcaCompetitionId, group] of groups) {
      synced += await this.syncNonParticipantReconsForPublishedCompetition(wcaCompetitionId, group)
    }
    if (synced > 0) {
      this.logger.log(`Synced ${synced} unresolved WCA non-participant reconstructions`)
    }
  }

  async syncWcaDataForCompetition(wcaCompetitionId: string): Promise<number> {
    const competition = await this.competitionsRepository.findOne({
      where: { wcaCompetitionId },
    })
    if (!competition) return 0

    const recons = await this.reconstructionsRepository.find({
      where: { competitionId: competition.id },
      relations: { user: true },
    })
    if (recons.length === 0) return 0

    // sync scrambles first
    await this.syncScramblesFromWca(wcaCompetitionId)

    // sync results
    const officialResultsData = await this.getWcaOfficialResults(wcaCompetitionId)
    const reconsToSave: WcaReconstructions[] = []

    for (const recon of recons) {
      const wcaId = recon.user?.wcaId
      let dirty = false

      // update isParticipant
      let isParticipant = false
      if (wcaId) {
        if (officialResultsData) {
          isParticipant = officialResultsData.results.some(r => r.wca_id === wcaId)
        } else {
          isParticipant = await this.isUserInWcaLive(wcaCompetitionId, wcaId)
        }
      }
      if (recon.isParticipant !== isParticipant) {
        recon.isParticipant = isParticipant
        dirty = true
      }

      // update wcaData
      if (wcaId && officialResultsData) {
        const userResults = officialResultsData.results
          .filter(r => r.wca_id === wcaId)
          .map(r => ({
            roundNumber: officialResultsData.roundMap.get(r.round_type_id) ?? 1,
            roundTypeId: r.round_type_id,
            pos: r.pos,
            best: r.best,
            average: r.average,
            attempts: r.attempts,
            regionalSingleRecord: r.regional_single_record,
            regionalAverageRecord: r.regional_average_record,
          }))
        if (userResults.length > 0) {
          const wcaData = { ...recon.wcaData, officialResults: userResults }
          delete wcaData.officialNonParticipant
          delete wcaData.officialNonParticipantAt
          recon.wcaData = wcaData
          dirty = true
        } else if (!recon.wcaData?.officialNonParticipant) {
          recon.wcaData = {
            ...recon.wcaData,
            officialNonParticipant: true,
            officialNonParticipantAt: new Date().toISOString(),
          }
          dirty = true
        }
      }

      if (dirty) {
        reconsToSave.push(recon)
      }
    }

    if (reconsToSave.length > 0) {
      await this.reconstructionsRepository.save(reconsToSave)
    }

    // update wcaMoves for all submissions
    const submissions = await this.submissionsRepository.find({
      where: { competitionId: competition.id },
      relations: { scramble: true },
    })

    const userIds = [...new Set(submissions.map(s => s.userId))]
    const users = userIds.length > 0 ? await this.usersRepository.findByIds(userIds) : []
    const wcaIdMap = new Map(users.filter(u => u.wcaId).map(u => [u.id, u.wcaId]))

    const subsToSave: Submissions[] = []
    for (const sub of submissions) {
      const wcaId = wcaIdMap.get(sub.userId)
      if (!wcaId || !sub.scramble) continue

      const wcaMoves = await this.getWcaMoves(wcaCompetitionId, wcaId, sub.scramble.roundNumber, sub.scramble.number)
      if (wcaMoves !== null && sub.wcaMoves !== wcaMoves) {
        sub.wcaMoves = wcaMoves
        subsToSave.push(sub)
      }
    }

    if (subsToSave.length > 0) {
      await this.submissionsRepository.save(subsToSave)
    }

    return reconsToSave.length + subsToSave.length
  }

  private async syncNonParticipantReconsForPublishedCompetition(
    wcaCompetitionId: string,
    recons: WcaReconstructions[],
  ): Promise<number> {
    const officialResultsData = await this.getWcaOfficialResults(wcaCompetitionId)
    if (!officialResultsData) return 0

    const toSave: WcaReconstructions[] = []
    for (const recon of recons) {
      const wcaId = recon.user?.wcaId
      if (!wcaId || recon.wcaData?.officialNonParticipant) continue

      const userResults = officialResultsData.results
        .filter(r => r.wca_id === wcaId)
        .map(r => ({
          roundNumber: officialResultsData.roundMap.get(r.round_type_id) ?? 1,
          roundTypeId: r.round_type_id,
          pos: r.pos,
          best: r.best,
          average: r.average,
          attempts: r.attempts,
          regionalSingleRecord: r.regional_single_record,
          regionalAverageRecord: r.regional_average_record,
        }))

      if (userResults.length > 0) {
        const wcaData = { ...recon.wcaData, officialResults: userResults }
        delete wcaData.officialNonParticipant
        delete wcaData.officialNonParticipantAt
        recon.wcaData = wcaData
        recon.isParticipant = true
      } else {
        recon.wcaData = {
          ...recon.wcaData,
          officialNonParticipant: true,
          officialNonParticipantAt: new Date().toISOString(),
        }
      }
      toSave.push(recon)
    }

    if (toSave.length > 0) {
      await this.reconstructionsRepository.save(toSave)
    }
    return toSave.length
  }

  async isUserParticipant(wcaCompetitionId: string, wcaId: string): Promise<boolean> {
    if (!wcaId) return false

    const data = await this.getWcaOfficialResults(wcaCompetitionId)
    if (data) return data.results.some(r => r.wca_id === wcaId)

    return this.isUserInWcaLive(wcaCompetitionId, wcaId)
  }

  // region Competition management

  private async getOrCreateCompetition(wcaCompetitionId: string): Promise<Competitions> {
    let competition = await this.competitionsRepository.findOne({
      where: { wcaCompetitionId },
    })
    if (competition) return competition

    const wcaComp = await this.fetchWcaCompetitionInfo(wcaCompetitionId)

    competition = this.competitionsRepository.create({
      alias: wcaCompetitionId,
      name: wcaComp?.name ?? wcaCompetitionId,
      type: CompetitionType.WCA_RECONSTRUCTION,
      format: CompetitionFormat.MO3,
      status: CompetitionStatus.ON_GOING,
      startTime: wcaComp?.start_date ? new Date(wcaComp.start_date) : new Date(),
      endTime: wcaComp?.end_date ? new Date(`${wcaComp.end_date}T23:59:59`) : null,
      wcaCompetitionId,
      userId: 1,
    })
    await this.competitionsRepository.save(competition)
    return competition
  }

  private async fetchWcaCompetitionInfo(
    wcaCompetitionId: string,
  ): Promise<{ name: string; start_date: string; end_date: string } | null> {
    try {
      const url = `${WCA_API_BASE}/competitions/${wcaCompetitionId}`
      const response = await firstValueFrom(
        this.httpService.get<{ name: string; start_date: string; end_date: string }>(url),
      )
      return response.data ?? null
    } catch {
      return null
    }
  }

  // endregion

  // region WCA API helpers

  async getWcifAttemptsPerRound(wcaCompetitionId: string): Promise<Record<number, number> | null> {
    try {
      const url = `${WCA_API_BASE}/competitions/${wcaCompetitionId}/wcif/public`
      const response = await firstValueFrom(this.httpService.get<{ events?: any[] }>(url))
      const fmEvent = response.data?.events?.find((e: any) => e.id === '333fm')
      if (!fmEvent?.rounds?.length) return null

      const result: Record<number, number> = {}
      for (let i = 0; i < fmEvent.rounds.length; i++) {
        result[i + 1] = formatIdToAttempts(fmEvent.rounds[i].format)
      }
      return result
    } catch {
      return null
    }
  }

  async getWcaOfficialResults(wcaCompetitionId: string): Promise<ParsedWcaResults | null> {
    try {
      const url = `${WCA_API_BASE}/competitions/${wcaCompetitionId}/results/333fm`
      const response = await firstValueFrom(this.httpService.get<WcaApiResultsResponse>(url))
      const rounds = response.data?.rounds
      if (!rounds?.length) return null
      const results = rounds.flatMap(r => r.results)
      if (results.length === 0) return null
      const roundMap = this.buildRoundNumberMap(rounds.map(r => r.roundTypeId))
      return { results, roundMap }
    } catch {
      return null
    }
  }

  async getWcaOfficialScrambles(wcaCompetitionId: string): Promise<ParsedWcaScrambles | null> {
    try {
      const url = `${WCA_API_BASE}/competitions/${wcaCompetitionId}/scrambles/333fm`
      const response = await firstValueFrom(this.httpService.get<WcaApiScramblesResponse>(url))
      const rounds = response.data?.rounds
      if (!rounds?.length) return null
      const scrambles = rounds.flatMap(r => r.scrambles)
      if (scrambles.length === 0) return null
      const roundMap = this.buildRoundNumberMap(rounds.map(r => r.roundTypeId))
      return { scrambles, roundMap }
    } catch {
      return null
    }
  }

  async getWcaMoves(
    wcaCompetitionId: string,
    wcaId: string,
    roundNumber: number,
    scrambleNumber: number,
  ): Promise<number | null> {
    if (!wcaId) return null

    const officialMoves = await this.getWcaMovesFromOfficial(wcaCompetitionId, wcaId, roundNumber, scrambleNumber)
    if (officialMoves !== null) return officialMoves

    return this.getWcaMovesFromLive(wcaCompetitionId, wcaId, roundNumber, scrambleNumber)
  }

  // endregion

  // region Private helpers

  private async getUserOfficialResults(wcaCompetitionId: string, wcaId: string): Promise<WcaOfficialRoundResult[]> {
    if (!wcaId) return []
    const data = await this.getWcaOfficialResults(wcaCompetitionId)
    if (!data) return []

    return data.results
      .filter(r => r.wca_id === wcaId)
      .map(r => ({
        roundNumber: data.roundMap.get(r.round_type_id) ?? 1,
        roundTypeId: r.round_type_id,
        pos: r.pos,
        best: r.best,
        average: r.average,
        attempts: r.attempts,
        regionalSingleRecord: r.regional_single_record,
        regionalAverageRecord: r.regional_average_record,
      }))
  }

  private buildRoundNumberMap(roundTypeIds: string[]): Map<string, number> {
    const priority: Record<string, number> = {
      '0': 0,
      '1': 1,
      d: 1.5,
      '2': 2,
      e: 2.5,
      '3': 3,
      g: 3.5,
      f: 10,
      c: 10.5,
      b: 11,
    }
    const unique = [...new Set(roundTypeIds)]
    unique.sort((a, b) => (priority[a] ?? 5) - (priority[b] ?? 5))
    const map = new Map<string, number>()
    unique.forEach((id, i) => map.set(id, i + 1))
    return map
  }

  private async getWcaMovesFromOfficial(
    wcaCompetitionId: string,
    wcaId: string,
    roundNumber: number,
    scrambleNumber: number,
  ): Promise<number | null> {
    const data = await this.getWcaOfficialResults(wcaCompetitionId)
    if (!data) return null

    const { results, roundMap } = data
    for (const result of results) {
      if (result.wca_id === wcaId) {
        const rn = roundMap.get(result.round_type_id) ?? 1
        if (rn === roundNumber && result.attempts[scrambleNumber - 1] !== undefined) {
          const attempt = result.attempts[scrambleNumber - 1]
          return transformWCAMoves(attempt)
        }
      }
    }
    return null
  }

  private async getWcaMovesFromLive(
    wcaCompetitionId: string,
    wcaId: string,
    roundNumber: number,
    scrambleNumber: number,
  ): Promise<number | null> {
    let shouldTryV1 = false
    try {
      const liveCompId = await this.findLiveCompetitionId(wcaCompetitionId)
      if (!liveCompId) return this.getWcaMovesFromV1Live(wcaCompetitionId, wcaId, roundNumber, scrambleNumber)

      const compResp = await firstValueFrom(
        this.httpService.post<{ data?: { competition?: { competitionEvents: any[] } } }>(WCA_LIVE_API, {
          query: `query($id: ID!) {
              competition(id: $id) {
                competitionEvents {
                  event { id }
                  rounds { id name number }
                }
              }
            }`,
          variables: { id: liveCompId },
        }),
      )
      const events = compResp.data?.data?.competition?.competitionEvents
      const fmEvent = events?.find((e: any) => e.event.id === '333fm')
      if (!fmEvent?.rounds?.length)
        return this.getWcaMovesFromV1Live(wcaCompetitionId, wcaId, roundNumber, scrambleNumber)
      const targetRound = fmEvent.rounds.find((r: any) => r.number === roundNumber) ?? fmEvent.rounds[roundNumber - 1]
      if (!targetRound) return this.getWcaMovesFromV1Live(wcaCompetitionId, wcaId, roundNumber, scrambleNumber)

      const roundResp = await firstValueFrom(
        this.httpService.post<{ data?: { round?: { results: any[] } } }>(WCA_LIVE_API, {
          query: `query($id: ID!) {
              round(id: $id) {
                results {
                  person { wcaId }
                  attempts { result }
                }
              }
            }`,
          variables: { id: targetRound.id },
        }),
      )
      const roundResults = roundResp.data?.data?.round?.results
      const personResult = roundResults?.find((r: any) => r.person?.wcaId === wcaId)
      if (!personResult) return this.getWcaMovesFromV1Live(wcaCompetitionId, wcaId, roundNumber, scrambleNumber)
      if (!personResult.attempts?.[scrambleNumber - 1]) return null
      const attemptResult = personResult.attempts[scrambleNumber - 1].result
      return transformWCAMoves(attemptResult)
    } catch (e) {
      this.logger.debug(`Failed to fetch WCA Live data: ${e}`)
      shouldTryV1 = true
    }

    return shouldTryV1 ? this.getWcaMovesFromV1Live(wcaCompetitionId, wcaId, roundNumber, scrambleNumber) : null
  }

  private async findLiveCompetitionId(wcaCompetitionId: string): Promise<string | null> {
    try {
      const resp = await firstValueFrom(
        this.httpService.post<{ data?: { competitions?: { id: string; wcaId: string }[] } }>(WCA_LIVE_API, {
          query: `query($filter: String!) { competitions(filter: $filter, limit: 5) { id wcaId } }`,
          variables: { filter: wcaCompetitionId },
        }),
      )
      const comps = resp.data?.data?.competitions
      if (!comps?.length) return null
      return comps.find(c => c.wcaId === wcaCompetitionId)?.id ?? comps[0].id
    } catch {
      return null
    }
  }

  private async getLiveCompetitionInfo(
    wcaCompetitionId: string,
  ): Promise<{ participantWcaIds: Set<string>; attemptsPerRound: Record<number, number> } | null> {
    try {
      const liveCompId = await this.findLiveCompetitionId(wcaCompetitionId)
      if (!liveCompId) return this.getV1LiveCompetitionInfo(wcaCompetitionId)

      const compResp = await firstValueFrom(
        this.httpService.post<{ data?: { competition?: { competitionEvents: any[] } } }>(WCA_LIVE_API, {
          query: `query($id: ID!) {
              competition(id: $id) {
                competitionEvents {
                  event { id }
                  rounds { id number format { numberOfAttempts } }
                }
              }
            }`,
          variables: { id: liveCompId },
        }),
      )
      const events = compResp.data?.data?.competition?.competitionEvents
      const fmEvent = events?.find((e: any) => e.event.id === '333fm')
      if (!fmEvent?.rounds?.length) return this.getV1LiveCompetitionInfo(wcaCompetitionId)

      const attemptsPerRound: Record<number, number> = {}
      for (const round of fmEvent.rounds) {
        attemptsPerRound[round.number] = round.format?.numberOfAttempts ?? 3
      }

      const r1 = fmEvent.rounds.find((r: any) => r.number === 1) ?? fmEvent.rounds[0]
      const roundResp = await firstValueFrom(
        this.httpService.post<{ data?: { round?: { results: any[] } } }>(WCA_LIVE_API, {
          query: `query($id: ID!) { round(id: $id) { results { person { wcaId } } } }`,
          variables: { id: r1.id },
        }),
      )
      const results = roundResp.data?.data?.round?.results ?? []
      const participantWcaIds = new Set(results.map((r: any) => r.person?.wcaId).filter(Boolean) as string[])
      if (participantWcaIds.size === 0) {
        return this.getV1LiveCompetitionInfo(wcaCompetitionId, attemptsPerRound)
      }

      return { participantWcaIds, attemptsPerRound }
    } catch {
      return this.getV1LiveCompetitionInfo(wcaCompetitionId)
    }
  }

  private async isUserInWcaLive(wcaCompetitionId: string, wcaId: string): Promise<boolean> {
    const info = await this.getLiveCompetitionInfo(wcaCompetitionId)
    return info?.participantWcaIds.has(wcaId) ?? false
  }

  private async getLiveUserData(
    wcaCompetitionId: string,
    wcaId: string,
  ): Promise<{ isParticipant: boolean; attempts: Record<string, number> } | null> {
    try {
      const liveCompId = await this.findLiveCompetitionId(wcaCompetitionId)
      if (!liveCompId) return this.getV1LiveUserData(wcaCompetitionId, wcaId)

      const compResp = await firstValueFrom(
        this.httpService.post<{ data?: { competition?: { competitionEvents: any[] } } }>(WCA_LIVE_API, {
          query: `query($id: ID!) {
              competition(id: $id) {
                competitionEvents {
                  event { id }
                  rounds { id number }
                }
              }
            }`,
          variables: { id: liveCompId },
        }),
      )
      const events = compResp.data?.data?.competition?.competitionEvents
      const fmEvent = events?.find((e: any) => e.event.id === '333fm')
      if (!fmEvent?.rounds?.length) return this.getV1LiveUserData(wcaCompetitionId, wcaId)

      let isParticipant = false
      const attempts: Record<string, number> = {}

      for (const round of fmEvent.rounds) {
        const roundResp = await firstValueFrom(
          this.httpService.post<{ data?: { round?: { results: any[] } } }>(WCA_LIVE_API, {
            query: `query($id: ID!) { round(id: $id) { results { person { wcaId } attempts { result } } } }`,
            variables: { id: round.id },
          }),
        )
        const personResult = roundResp.data?.data?.round?.results?.find((r: any) => r.person?.wcaId === wcaId)
        if (personResult) {
          isParticipant = true
          for (let i = 0; i < personResult.attempts.length; i++) {
            const result = personResult.attempts[i].result
            if (result !== 0) {
              attempts[`${round.number}-${i + 1}`] = result
            }
          }
        }
      }

      if (isParticipant) return { isParticipant, attempts }
      return this.getV1LiveUserData(wcaCompetitionId, wcaId)
    } catch {
      return this.getV1LiveUserData(wcaCompetitionId, wcaId)
    }
  }

  private async getWcaMovesFromV1Live(
    wcaCompetitionId: string,
    wcaId: string,
    roundNumber: number,
    scrambleNumber: number,
  ): Promise<number | null> {
    const liveData = await this.getV1LiveUserData(wcaCompetitionId, wcaId)
    const value = liveData?.attempts[`${roundNumber}-${scrambleNumber}`]
    return value === undefined ? null : transformWCAMoves(value)
  }

  private async getV1LiveCompetitionInfo(
    wcaCompetitionId: string,
    attemptsPerRound: Record<number, number> = {},
  ): Promise<{ participantWcaIds: Set<string>; attemptsPerRound: Record<number, number> } | null> {
    try {
      const [registrationMaps, firstRound] = await Promise.all([
        this.getV1RegistrationMaps(wcaCompetitionId),
        this.getV1LiveRound(wcaCompetitionId, 1),
      ])

      const roundIds = firstRound?.linked_round_ids?.length ? firstRound.linked_round_ids : ['333fm-r1']
      for (const roundId of roundIds) {
        const rn = this.getRoundNumberFromLiveRoundId(roundId)
        if (!rn || attemptsPerRound[rn]) continue

        const round = rn === 1 && firstRound ? firstRound : await this.getV1LiveRound(wcaCompetitionId, rn)
        attemptsPerRound[rn] = formatIdToAttempts(round?.format ?? 'm')
      }

      return { participantWcaIds: registrationMaps.participantWcaIds, attemptsPerRound }
    } catch (e) {
      this.logger.debug(`Failed to fetch WCA API v1 live competition data: ${e}`)
      return null
    }
  }

  private async getV1LiveUserData(
    wcaCompetitionId: string,
    wcaId: string,
  ): Promise<{ isParticipant: boolean; attempts: Record<string, number> } | null> {
    try {
      const [registrationMaps, firstRound] = await Promise.all([
        this.getV1RegistrationMaps(wcaCompetitionId),
        this.getV1LiveRound(wcaCompetitionId, 1),
      ])
      const isParticipant = registrationMaps.participantWcaIds.has(wcaId)
      const attempts: Record<string, number> = {}

      const roundIds = firstRound?.linked_round_ids?.length ? firstRound.linked_round_ids : ['333fm-r1']
      for (const roundId of roundIds) {
        const rn = this.getRoundNumberFromLiveRoundId(roundId)
        if (!rn) continue

        const round = rn === 1 && firstRound ? firstRound : await this.getV1LiveRound(wcaCompetitionId, rn)
        const personResult = round?.results?.find(result => {
          const registrationWcaId =
            result.registration_id === undefined
              ? undefined
              : registrationMaps.wcaIdByRegistrationId.get(result.registration_id)
          const registrantWcaId =
            result.registrant_id === undefined
              ? undefined
              : registrationMaps.wcaIdByRegistrantId.get(result.registrant_id)
          return registrationWcaId === wcaId || registrantWcaId === wcaId
        })
        if (!personResult?.attempts?.length) continue

        for (const attempt of personResult.attempts) {
          if (attempt.value !== 0) {
            attempts[`${rn}-${attempt.attempt_number}`] = attempt.value
          }
        }
      }

      return isParticipant || Object.keys(attempts).length > 0 ? { isParticipant, attempts } : null
    } catch (e) {
      this.logger.debug(`Failed to fetch WCA API v1 live user data: ${e}`)
      return null
    }
  }

  private async getV1RegistrationMaps(wcaCompetitionId: string): Promise<{
    participantWcaIds: Set<string>
    wcaIdByRegistrationId: Map<number, string>
    wcaIdByRegistrantId: Map<number, string>
  }> {
    const url = `${WCA_API_V1_BASE}/competitions/${wcaCompetitionId}/registrations`
    const response = await firstValueFrom(this.httpService.get<WcaApiV1Registration[]>(url))
    const registrations = response.data ?? []
    const participantWcaIds = new Set<string>()
    const wcaIdByRegistrationId = new Map<number, string>()
    const wcaIdByRegistrantId = new Map<number, string>()

    for (const registration of registrations) {
      const wcaId = registration.user?.wca_id
      if (!wcaId || !registration.competing?.event_ids?.includes('333fm')) continue

      participantWcaIds.add(wcaId)
      wcaIdByRegistrationId.set(registration.id, wcaId)
      wcaIdByRegistrantId.set(registration.registrant_id, wcaId)
    }

    return { participantWcaIds, wcaIdByRegistrationId, wcaIdByRegistrantId }
  }

  private async getV1LiveRound(wcaCompetitionId: string, roundNumber: number): Promise<WcaApiV1RoundResponse | null> {
    try {
      const url = `${WCA_API_V1_BASE}/competitions/${wcaCompetitionId}/live/rounds/333fm-r${roundNumber}`
      const response = await firstValueFrom(this.httpService.get<WcaApiV1RoundResponse>(url))
      return response.data ?? null
    } catch {
      return null
    }
  }

  private getRoundNumberFromLiveRoundId(roundId: string): number | null {
    const match = roundId.match(/^333fm-r(\d+)$/)
    return match ? Number(match[1]) : null
  }

  private async tryVerifyScramble(scramble: Scrambles, wcaCompetitionId: string) {
    if (scramble.verified) return

    const data = await this.getWcaOfficialScrambles(wcaCompetitionId)
    if (!data) return

    const { scrambles: officialScrambles, roundMap } = data
    const matching = officialScrambles
      .filter(s => !s.is_extra)
      .filter(s => s.scramble_num === scramble.number)
      .filter(s => (roundMap.get(s.round_type_id) ?? 1) === scramble.roundNumber)

    if (matching.length > 0) {
      scramble.scramble = matching[0].scramble
      scramble.verified = true
      await this.scramblesRepository.save(scramble)
    }
  }

  // endregion
}
