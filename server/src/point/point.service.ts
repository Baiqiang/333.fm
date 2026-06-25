import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import { UserPoints } from '@/entities/user-points.entity'
import { Users } from '@/entities/users.entity'

export interface RankingEntry {
  rank: number
  user: Users
  totalPoints: number
  breakdown: Record<string, number>
}

export interface UserPointHistory {
  id: number
  source: string
  competitionId: number | null
  points: number
  pointDetails: Record<string, number> | null
  earnedAt: string
  competition?: { id: number; name: string; alias: string; url: string }
}

@Injectable()
export class PointQueryService {
  constructor(
    @InjectRepository(UserPoints)
    private readonly userPointsRepository: Repository<UserPoints>,
  ) {}

  async getRankings(limit = 50, offset = 0): Promise<{ items: RankingEntry[]; total: number }> {
    const qb = this.userPointsRepository
      .createQueryBuilder('up')
      .select('up.userId', 'userId')
      .addSelect('SUM(up.points)', 'totalPoints')
      .groupBy('up.userId')
      .orderBy('totalPoints', 'DESC')

    const total = await qb.clone().getCount()

    const raw: { userId: number; totalPoints: string }[] = await qb.offset(offset).limit(limit).getRawMany()

    if (!raw.length) return { items: [], total }

    const userIds = raw.map(r => r.userId)

    const breakdowns: { userId: number; source: string; sourcePoints: string }[] = await this.userPointsRepository
      .createQueryBuilder('up')
      .select('up.userId', 'userId')
      .addSelect('up.source', 'source')
      .addSelect('SUM(up.points)', 'sourcePoints')
      .where('up.userId IN (:...userIds)', { userIds })
      .groupBy('up.userId')
      .addGroupBy('up.source')
      .getRawMany()

    const breakdownMap = new Map<number, Record<string, number>>()
    for (const row of breakdowns) {
      const map = breakdownMap.get(row.userId) || {}
      map[row.source] = parseFloat(row.sourcePoints)
      breakdownMap.set(row.userId, map)
    }

    const users = await this.userPointsRepository.manager
      .getRepository(Users)
      .createQueryBuilder('u')
      .whereInIds(userIds)
      .getMany()
    const userMap = new Map(users.map(u => [u.id, u]))

    return {
      items: raw.map((r, i) => ({
        rank: offset + i + 1,
        user: userMap.get(r.userId)!,
        totalPoints: parseFloat(r.totalPoints),
        breakdown: breakdownMap.get(r.userId) || {},
      })),
      total,
    }
  }

  async getUserHistory(userId: number): Promise<UserPointHistory[]> {
    const records = await this.userPointsRepository.find({
      where: { userId },
      order: { earnedAt: 'ASC' },
      relations: { competition: true },
    })

    return records.map(r => ({
      id: r.id,
      source: r.source,
      competitionId: r.competitionId,
      points: r.points,
      pointDetails: r.pointDetails,
      earnedAt: r.earnedAt.toISOString(),
      competition: r.competition
        ? { id: r.competition.id, name: r.competition.name, alias: r.competition.alias, url: r.competition.url }
        : undefined,
    }))
  }

  async getUserSummary(
    userId: number,
  ): Promise<{ totalPoints: number; breakdown: Record<string, number>; count: number }> {
    const rows: { source: string; sourcePoints: string; cnt: string }[] = await this.userPointsRepository
      .createQueryBuilder('up')
      .select('up.source', 'source')
      .addSelect('SUM(up.points)', 'sourcePoints')
      .addSelect('COUNT(*)', 'cnt')
      .where('up.userId = :userId', { userId })
      .groupBy('up.source')
      .getRawMany()

    let totalPoints = 0
    let count = 0
    const breakdown: Record<string, number> = {}
    for (const row of rows) {
      const pts = parseFloat(row.sourcePoints)
      breakdown[row.source] = pts
      totalPoints += pts
      count += parseInt(row.cnt)
    }

    return { totalPoints, breakdown, count }
  }
}
