import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { In, Repository } from 'typeorm'

import { Comments } from '@/entities/comments.entity'
import {
  CompetitionMode,
  Competitions,
  CompetitionStatus,
  CompetitionSubType,
  CompetitionType,
} from '@/entities/competitions.entity'
import { Results } from '@/entities/results.entity'
import { Submissions } from '@/entities/submissions.entity'
import { UserActivities } from '@/entities/user-activities.entity'
import { Users } from '@/entities/users.entity'
import { compNow } from '@/utils'

const excludePracticeSubTypes = [
  CompetitionSubType.EO_PRACTICE,
  CompetitionSubType.DR_PRACTICE,
  CompetitionSubType.JZP_PRACTICE,
  CompetitionSubType.HTR_PRACTICE,
]

const excludeCompetitionTypes = [CompetitionType.FMC_CHAIN]
const excludeCompetitionTypesForWeeklyActive = [CompetitionType.FMC_CHAIN]

const DEFAULT_LIMIT = 20

function ywToStr(yw: number) {
  const year = Math.floor(yw / 100)
  const week = yw % 100
  return `${year}-${week.toString().padStart(2, '0')}`
}
@Injectable()
export class StatsService {
  constructor(
    @InjectRepository(Submissions)
    private readonly submissionsRepository: Repository<Submissions>,
    @InjectRepository(Competitions)
    private readonly competitionsRepository: Repository<Competitions>,
    @InjectRepository(Results)
    private readonly resultsRepository: Repository<Results>,
    @InjectRepository(UserActivities)
    private readonly userActivitiesRepository: Repository<UserActivities>,
    @InjectRepository(Comments)
    private readonly commentsRepository: Repository<Comments>,
    @InjectRepository(Users)
    private readonly usersRepository: Repository<Users>,
  ) { }

  async getAll() {
    const [topLiked, topFavorited, topCommented, weeklyBestSingles, weeklyActiveSubmitters, topSubmitters, topWinners] =
      await Promise.all([
        this.getTopLiked(),
        this.getTopFavorited(),
        this.getTopCommented(),
        this.getWeeklyBestSingles(),
        this.getWeeklyActiveSubmitters(),
        this.getTopSubmitters(),
        this.getTopWinners(),
      ])

    return {
      topLiked,
      topFavorited,
      topCommented,
      weeklyBestSingles,
      weeklyActiveSubmitters,
      topSubmitters,
      topWinners,
    }
  }

  /** 当前周周一 10:00（赛事时区），用于排除当前周避免剧透 */
  private getCurrentWeekStart(): Date {
    const now = compNow()
    let monday = now.day(1).hour(10).minute(0).second(0).millisecond(0)
    // On Sunday or Monday before 10:00, .day(1) points to the upcoming Monday,
    // but the current competition started the previous Monday.
    if (now.isBefore(monday)) {
      monday = monday.subtract(7, 'day')
    }
    return monday.toDate()
  }

  private submissionsBefore(
    currentWeekStart?: Date,
    excludeTypes: CompetitionType[] = excludeCompetitionTypes,
  ) {
    if (!currentWeekStart) {
      currentWeekStart = this.getCurrentWeekStart()
    }
    return this.submissionsRepository
      .createQueryBuilder('s')
      .leftJoin('s.competition', 'c')
      .where('c.type NOT IN (:...excludeTypes)', { excludeTypes })
      .andWhere('c.subType NOT IN (:...practiceSubTypes)', { practiceSubTypes: excludePracticeSubTypes })
      .andWhere('s.moves > 0')
      .andWhere('s.created_at < :currentWeekStart', { currentWeekStart })
  }

  private async loadSubmissionsByIds(ids: number[]) {
    if (ids.length === 0) return []
    const qb = this.submissionsRepository
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.user', 'u')
      .leftJoinAndSelect('s.competition', 'c')
      .leftJoinAndSelect('c.user', 'cUser')
      .leftJoinAndSelect('s.scramble', 'sc')
    const submissions = await Submissions.withActivityCounts(qb).where('s.id IN (:...ids)', { ids }).getMany()
    const map = new Map(submissions.map(s => [s.id, s]))
    return ids.map(id => map.get(id)).filter(Boolean) as Submissions[]
  }

  async getTopLiked(limit = DEFAULT_LIMIT) {
    const likeCountExpr = '(SELECT COUNT(*) FROM user_activities ua WHERE ua.submission_id = s.id AND ua.`like` = 1)'
    const ranked = await this.submissionsBefore()
      .select('s.id', 'id')
      .addSelect(likeCountExpr, 'cnt')
      .andWhere(`${likeCountExpr} > 0`)
      .orderBy('cnt', 'DESC')
      .limit(limit)
      .getRawMany()

    return this.loadSubmissionsByIds(ranked.map(r => r.id))
  }

  async getTopFavorited(limit = DEFAULT_LIMIT) {
    const favCountExpr = '(SELECT COUNT(*) FROM user_activities ua WHERE ua.submission_id = s.id AND ua.favorite = 1)'
    const ranked = await this.submissionsBefore()
      .select('s.id', 'id')
      .addSelect(favCountExpr, 'cnt')
      .andWhere(`${favCountExpr} > 0`)
      .orderBy('cnt', 'DESC')
      .limit(limit)
      .getRawMany()

    return this.loadSubmissionsByIds(ranked.map(r => r.id))
  }

  async getTopCommented(limit = DEFAULT_LIMIT) {
    const currentWeekStart = this.getCurrentWeekStart()
    const ranked = await this.commentsRepository
      .createQueryBuilder('cm')
      .select('cm.submission_id', 'submissionId')
      .addSelect('COUNT(*)', 'cnt')
      .leftJoin('cm.submission', 's')
      .leftJoin('s.competition', 'c')
      .where('c.type NOT IN (:...excludeTypes)', { excludeTypes: excludeCompetitionTypes })
      .andWhere('c.subType NOT IN (:...practiceSubTypes)', { practiceSubTypes: excludePracticeSubTypes })
      .andWhere('s.moves > 0')
      .andWhere('s.created_at < :currentWeekStart', { currentWeekStart })
      .groupBy('cm.submission_id')
      .orderBy('cnt', 'DESC')
      .limit(limit)
      .getRawMany()

    const submissions = await this.loadSubmissionsByIds(ranked.map(r => r.submissionId))
    const countMap: Record<number, number> = {}
    for (const row of ranked) {
      countMap[row.submissionId] = Number(row.cnt)
    }
    return submissions.map(s => ({ ...s, commentCount: countMap[s.id] || 0 }))
  }

  /** 每周全场最佳：按提交时间所在周，该周内步数最短的一条（排除 CHAIN、ENDLESS 和当前周） */
  async getWeeklyBestSingles() {
    const rows = await this.submissionsBefore(undefined, [CompetitionType.FMC_CHAIN, CompetitionType.ENDLESS])
      .select('s.id', 'id')
      .addSelect('s.moves', 'moves')
      .addSelect('s.created_at', 'createdAt')
      .addSelect('YEARWEEK(s.created_at, 3)', 'yw')
      .orderBy('yw', 'ASC')
      .addOrderBy('s.moves', 'ASC')
      .addOrderBy('s.created_at', 'ASC')
      .getRawMany()

    const bestIdByWeek = new Map<number, number>()
    for (const row of rows) {
      const yw = Number(row.yw)
      if (!bestIdByWeek.has(yw)) {
        bestIdByWeek.set(yw, row.id)
      }
    }

    const ids = [...bestIdByWeek.values()]
    if (ids.length === 0) return []

    const submissions = await this.loadSubmissionsByIds(ids)

    const weekKeys = [...bestIdByWeek.entries()]
      .sort((a, b) => a[0] - b[0])
      .slice(-DEFAULT_LIMIT)
      .reverse()

    return weekKeys
      .map(([yw, id]) => {
        const submission = submissions.find(s => s.id === id)
        return {
          week: ywToStr(yw),
          submission: submission ?? null,
        }
      })
      .filter(item => item.submission !== null)
  }

  /** 每周最活跃的选手：最近 20 周，每周按提交次数排序取前 20 名（含当前周和 WCA recon，排除 CHAIN、练习） */
  async getWeeklyActiveSubmitters(weeksLimit = DEFAULT_LIMIT, topPerWeek = DEFAULT_LIMIT) {
    const rows = await this.submissionsRepository
      .createQueryBuilder('s')
      .leftJoin('s.competition', 'c')
      .where('c.type NOT IN (:...excludeTypes)', { excludeTypes: excludeCompetitionTypesForWeeklyActive })
      .andWhere('c.subType NOT IN (:...practiceSubTypes)', { practiceSubTypes: excludePracticeSubTypes })
      .andWhere('s.moves > 0')
      .select('YEARWEEK(s.created_at, 3)', 'yw')
      .addSelect('s.user_id', 'userId')
      .addSelect('COUNT(*)', 'cnt')
      .groupBy('yw')
      .addGroupBy('s.user_id')
      .orderBy('yw', 'DESC')
      .addOrderBy('cnt', 'DESC')
      .getRawMany()

    const byWeek = new Map<number, { userId: number; cnt: number }[]>()
    for (const r of rows) {
      const yw = Number(r.yw)
      if (!byWeek.has(yw)) byWeek.set(yw, [])
      const list = byWeek.get(yw)!
      if (list.length < topPerWeek) list.push({ userId: r.userId, cnt: Number(r.cnt) })
    }

    const sortedWeeks = [...byWeek.keys()].sort((a, b) => b - a).slice(0, weeksLimit)
    if (sortedWeeks.length === 0) return []

    const userIds = [...new Set(rows.map(r => r.userId))]
    const userMap = new Map((await this.usersRepository.find({ where: { id: In(userIds) } })).map(u => [u.id, u]))

    return sortedWeeks.map(yw => ({
      week: ywToStr(yw),
      submitters: (byWeek.get(yw) ?? [])
        .map(({ userId, cnt }) => ({
          user: userMap.get(userId) ?? null,
          submissionCount: cnt,
        }))
        .filter(s => s.user !== null),
    }))
  }

  async getTopSubmitters(limit = DEFAULT_LIMIT) {
    const results = await this.submissionsRepository
      .createQueryBuilder('s')
      .leftJoin('s.competition', 'c')
      .leftJoin('s.user', 'u')
      .select('s.user_id', 'userId')
      .addSelect('u.id', 'u_id')
      .addSelect('u.name', 'u_name')
      .addSelect('u.wca_id', 'u_wcaId')
      .addSelect('u.avatar', 'u_avatar')
      .addSelect('u.avatar_thumb', 'u_avatarThumb')
      .addSelect('COUNT(*)', 'submissionCount')
      .addSelect('MIN(s.moves)', 'bestSingle')
      .where('c.type NOT IN (:...excludeTypes)', { excludeTypes: excludeCompetitionTypes })
      .andWhere('c.subType NOT IN (:...practiceSubTypes)', { practiceSubTypes: excludePracticeSubTypes })
      .andWhere('s.moves > 0')
      .andWhere('s.mode = :mode', { mode: CompetitionMode.REGULAR })
      .groupBy('s.user_id')
      .orderBy('COUNT(*)', 'DESC')
      .limit(limit)
      .getRawMany()

    return results.map(r => ({
      user: {
        id: r.u_id,
        name: r.u_name,
        wcaId: r.u_wcaId,
        avatar: r.u_avatar,
        avatarThumb: r.u_avatarThumb,
      },
      submissionCount: Number(r.submissionCount),
      bestSingle: Number(r.bestSingle),
    }))
  }

  async getTopWinners(limit = DEFAULT_LIMIT) {
    const results = await this.resultsRepository
      .createQueryBuilder('r')
      .leftJoin('r.competition', 'c')
      .leftJoin('r.user', 'u')
      .select('r.user_id', 'userId')
      .addSelect('u.id', 'u_id')
      .addSelect('u.name', 'u_name')
      .addSelect('u.wca_id', 'u_wcaId')
      .addSelect('u.avatar', 'u_avatar')
      .addSelect('u.avatar_thumb', 'u_avatarThumb')
      .addSelect('COUNT(*)', 'wins')
      .where('c.type IN (:...types)', {
        types: [CompetitionType.WEEKLY, CompetitionType.DAILY, CompetitionType.LEAGUE],
      })
      .andWhere('c.status = :status', { status: CompetitionStatus.ENDED })
      .andWhere('r.rank = 1')
      .andWhere('r.mode = :mode', { mode: CompetitionMode.REGULAR })
      .groupBy('r.user_id')
      .orderBy('COUNT(*)', 'DESC')
      .limit(limit)
      .getRawMany()

    return results.map(r => ({
      user: {
        id: r.u_id,
        name: r.u_name,
        wcaId: r.u_wcaId,
        avatar: r.u_avatar,
        avatarThumb: r.u_avatarThumb,
      },
      wins: Number(r.wins),
    }))
  }
}
