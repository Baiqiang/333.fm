import { Injectable, Logger } from '@nestjs/common'
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm'
import { DataSource, EntityManager, IsNull, Repository } from 'typeorm'

import { Users } from '@/entities/users.entity'

interface UserReferenceColumn {
  table: string
  column: string
  uniqueBy?: string[]
  optional?: boolean
}

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name)
  private readonly tableExistsCache = new Map<string, boolean>()

  private readonly userReferenceColumns: UserReferenceColumn[] = [
    { table: 'submissions', column: 'user_id' },
    { table: 'scrambles', column: 'submitted_by_id' },
    { table: 'results', column: 'user_id' },
    { table: 'endless_kickoffs', column: 'user_id' },
    { table: 'user_insertion_finders', column: 'user_id', uniqueBy: ['insertion_finder_id'] },
    { table: 'competitions', column: 'user_id' },
    { table: 'wca_reconstructions', column: 'user_id', uniqueBy: ['competition_id'] },
    { table: 'user_points', column: 'user_id' },
    { table: 'comments', column: 'user_id' },
    { table: 'comments_mentions_users', column: 'users_id', uniqueBy: ['comments_id'], optional: true },
    { table: 'user_activities', column: 'user_id' },
    { table: 'notifications', column: 'user_id' },
    { table: 'notifications', column: 'source_user_id' },
    { table: 'daily_quiz_submissions', column: 'user_id', uniqueBy: ['quiz_id'] },
    { table: 'dr_trigger_games', column: 'user_id' },
    { table: 'attachments', column: 'user_id' },
    { table: 'league_participants', column: 'user_id', uniqueBy: ['season_id'] },
    { table: 'league_players', column: 'user_id' },
    { table: 'league_results', column: 'user_id' },
    { table: 'league_elos', column: 'user_id' },
    { table: 'league_elo_histories', column: 'user_id' },
    { table: 'league_standings', column: 'user_id' },
    { table: 'league_duels', column: 'user1_id' },
    { table: 'league_duels', column: 'user2_id' },
    { table: 'user_roles', column: 'user_id' },
    { table: 'bot_tokens', column: 'user_id' },
    { table: 'endless_challenge_conditions', column: 'triggered_by_user_id' },
  ]

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @InjectRepository(Users)
    private readonly usersRepository: Repository<Users>,
  ) {}

  async merge() {
    const duplicatedWCAIds = await this.usersRepository
      .createQueryBuilder()
      .select('wca_id wcaId')
      .where('wca_id != "" && source != "MERGED"')
      .groupBy('wca_id')
      .having('count(wca_id) > 1')
      .getRawMany<{ wcaId: string }>()
    this.logger.log(`Found ${duplicatedWCAIds.length} duplicated WCA IDs`)
    for (const { wcaId } of duplicatedWCAIds) {
      const users = await this.usersRepository.find({
        where: {
          wcaId,
        },
        order: {
          id: 'ASC',
        },
      })
      await this.mergeUsers(users, `WCA ID ${wcaId}`)
    }

    // set source to WCA and sourceId to wcaId if source is empty
    await this.usersRepository
      .createQueryBuilder()
      .update(Users)
      .set({
        source: 'WCA',
        sourceId: () => 'wca_id',
      })
      .where('source = ""')
      .execute()
  }

  async checkMerge() {
    const mergedUsers = await this.usersRepository.find({
      where: {
        source: 'MERGED',
      },
      order: {
        id: 'ASC',
      },
    })
    let issueCount = 0
    this.logger.log(`Checking ${mergedUsers.length} merged users`)
    await this.checkDuplicatedNames()

    for (const user of mergedUsers) {
      const target = await this.resolveMergeTarget(user)
      if (!target) {
        issueCount++
        this.logger.error(
          `No active target found for merged user #${user.id} ${user.name} (${user.wcaId || 'no WCA ID'})`,
        )
        continue
      }

      const staleReferences = await this.getUserReferenceIssues(user.id)
      if (staleReferences.length > 0) {
        issueCount += staleReferences.length
        this.logger.error(
          `Merged user #${user.id} still has references; expected target #${target.id} ${target.name}: ${staleReferences.join(
            ', ',
          )}`,
        )
      }
    }

    if (issueCount > 0) {
      process.exitCode = 1
      this.logger.error(`Merge check failed with ${issueCount} issue(s)`)
      return
    }

    this.logger.log('Merge check passed')
  }

  async migrateUserData(fromUserId: number, toUserId: number) {
    if (fromUserId === toUserId) {
      this.logger.error('fromUserId and toUserId must be different')
      process.exitCode = 1
      return
    }

    const [fromUser, toUser] = await Promise.all([
      this.usersRepository.findOne({ where: { id: fromUserId } }),
      this.usersRepository.findOne({ where: { id: toUserId } }),
    ])
    if (!fromUser || !toUser) {
      if (!fromUser) this.logger.error(`Source user #${fromUserId} not found`)
      if (!toUser) this.logger.error(`Target user #${toUserId} not found`)
      process.exitCode = 1
      return
    }
    if (fromUser.name !== toUser.name) {
      this.logger.error(
        `Source user #${fromUser.id} name "${fromUser.name}" does not match target user #${toUser.id} name "${toUser.name}"`,
      )
      process.exitCode = 1
      return
    }
    if (fromUser.wcaId && toUser.wcaId && fromUser.wcaId !== toUser.wcaId) {
      this.logger.error(
        `Source user #${fromUser.id} WCA ID "${fromUser.wcaId}" does not match target user #${toUser.id} WCA ID "${toUser.wcaId}"`,
      )
      process.exitCode = 1
      return
    }
    if (!fromUser.wcaId || !toUser.wcaId) {
      this.logger.warn(
        `Migrating users with missing WCA ID: source #${fromUser.id} ${fromUser.wcaId || 'no WCA ID'}, target #${
          toUser.id
        } ${toUser.wcaId || 'no WCA ID'}`,
      )
    }

    this.logger.log(`Migrating user data from #${fromUser.id} ${fromUser.name} to #${toUser.id} ${toUser.name}`)
    await this.dataSource.transaction(async manager => {
      await this.migrateUserReferences(fromUserId, toUserId, manager)
    })

    const remainingReferences = await this.getUserReferenceIssues(fromUserId)
    if (remainingReferences.length > 0) {
      process.exitCode = 1
      this.logger.error(`User #${fromUserId} still has references after migration: ${remainingReferences.join(', ')}`)
      return
    }

    this.logger.log('User data migration completed')
  }

  async backfillPrimaryUserId() {
    const mergedUsers = await this.usersRepository.find({
      where: { source: 'MERGED', primaryUserId: IsNull() },
    })
    this.logger.log(`Found ${mergedUsers.length} merged users without primaryUserId`)

    let updated = 0
    for (const user of mergedUsers) {
      const target = await this.resolveMergeTarget(user)
      if (!target) {
        this.logger.warn(`No active target for merged user #${user.id} ${user.name} (${user.wcaId || 'no WCA ID'})`)
        continue
      }
      await this.usersRepository.update({ id: user.id }, { primaryUserId: target.id })
      updated++
    }
    this.logger.log(`Backfilled primaryUserId for ${updated} merged users`)
  }

  private async mergeUsers(users: Users[], reason: string) {
    const activeUsers = users.filter(user => user.source !== 'MERGED')
    if (activeUsers.length <= 1) return

    const mainUser = this.pickMainUser(activeUsers)
    this.logger.log(`Merging ${activeUsers.length - 1} user(s) into #${mainUser.id} ${mainUser.name} (${reason})`)

    await this.dataSource.transaction(async manager => {
      for (const user of activeUsers) {
        if (user.id === mainUser.id) continue
        await this.mergeUser(user, mainUser, manager)
      }
    })
  }

  private pickMainUser(users: Users[]) {
    return [...users].sort((a, b) => {
      if (!!a.wcaId !== !!b.wcaId) return a.wcaId ? -1 : 1
      return b.id - a.id
    })[0]
  }

  private async mergeUser(user: Users, mainUser: Users, manager: EntityManager) {
    await this.migrateUserReferences(user.id, mainUser.id, manager)
    await manager.update(Users, { id: user.id }, { source: 'MERGED', primaryUserId: mainUser.id })
  }

  private async migrateUserReferences(fromUserId: number, toUserId: number, manager: EntityManager) {
    for (const reference of this.userReferenceColumns) {
      await this.migrateReference(reference, fromUserId, toUserId, manager)
    }
    await this.migrateEndlessConditionContributors(fromUserId, toUserId, manager)
  }

  private async checkDuplicatedNames() {
    const duplicatedNames = await this.usersRepository
      .createQueryBuilder()
      .select('name')
      .where('name != "" AND source != "MERGED"')
      .groupBy('name')
      .having('count(name) > 1')
      .getRawMany<{ name: string }>()
    this.logger.log(`Found ${duplicatedNames.length} duplicated active names`)

    for (const { name } of duplicatedNames) {
      const users = await this.usersRepository
        .createQueryBuilder()
        .where('name = :name', { name })
        .andWhere('source != "MERGED"')
        .orderBy('id', 'ASC')
        .getMany()
      this.logger.warn(
        `Duplicated active name "${name}": ${users.map(user => `#${user.id} ${user.wcaId || 'no WCA ID'}`).join(', ')}`,
      )
    }
  }

  private async getUserReferenceIssues(userId: number) {
    const staleReferences: string[] = []
    for (const reference of this.userReferenceColumns) {
      const count = await this.countUserReferences(reference, userId)
      if (count > 0) {
        staleReferences.push(`${reference.table}.${reference.column}: ${count}`)
      }
    }

    const contributorCount = await this.countEndlessConditionContributors(userId)
    if (contributorCount > 0) {
      staleReferences.push(`endless_challenge_conditions.contributors: ${contributorCount}`)
    }

    return staleReferences
  }

  private async migrateReference(
    { table, column, uniqueBy = [], optional = false }: UserReferenceColumn,
    fromUserId: number,
    toUserId: number,
    manager: EntityManager,
  ) {
    if (!(await this.tableExists(table, manager))) {
      if (!optional) this.logger.warn(`Skipped missing table ${table}`)
      return
    }

    if (uniqueBy.length > 0) {
      const conflictConditions = uniqueBy
        .map(uniqueColumn => `target_row.\`${uniqueColumn}\` = source_row.\`${uniqueColumn}\``)
        .join(' AND ')
      await manager.query(
        `DELETE source_row FROM \`${table}\` source_row INNER JOIN \`${table}\` target_row ON ${conflictConditions} WHERE source_row.\`${column}\` = ? AND target_row.\`${column}\` = ?`,
        [fromUserId, toUserId],
      )
    }

    await manager.query(`UPDATE \`${table}\` SET \`${column}\` = ? WHERE \`${column}\` = ?`, [toUserId, fromUserId])
  }

  private async migrateEndlessConditionContributors(fromUserId: number, toUserId: number, manager: EntityManager) {
    const table = 'endless_challenge_conditions'
    if (!(await this.tableExists(table, manager))) return

    const rows = await manager.query(
      `SELECT \`id\`, \`contributors\` FROM \`${table}\` WHERE \`contributors\` IS NOT NULL`,
    )
    for (const row of rows) {
      const contributors = typeof row.contributors === 'string' ? JSON.parse(row.contributors) : row.contributors
      if (!Array.isArray(contributors)) continue

      let changed = false
      const nextContributors = contributors.map(contributor => {
        if (contributor?.userId !== fromUserId) return contributor
        changed = true
        return { ...contributor, userId: toUserId }
      })
      if (!changed) continue

      await manager.query(`UPDATE \`${table}\` SET \`contributors\` = ? WHERE \`id\` = ?`, [
        JSON.stringify(nextContributors),
        row.id,
      ])
    }
  }

  private async resolveMergeTarget(user: Users) {
    if (user.wcaId) {
      const targetByWcaId = await this.usersRepository
        .createQueryBuilder()
        .where('wca_id = :wcaId', { wcaId: user.wcaId })
        .andWhere('source != "MERGED"')
        .orderBy('id', 'DESC')
        .getOne()
      if (targetByWcaId) return targetByWcaId
    }

    return this.usersRepository
      .createQueryBuilder()
      .where('name = :name', { name: user.name })
      .andWhere('source != "MERGED"')
      .orderBy('id', 'DESC')
      .getOne()
  }

  private async countUserReferences({ table, column }: UserReferenceColumn, userId: number) {
    if (!(await this.tableExists(table, this.dataSource.manager))) return 0

    const rows = await this.dataSource.manager.query(
      `SELECT COUNT(*) count FROM \`${table}\` WHERE \`${column}\` = ?`,
      [userId],
    )
    return Number(rows[0]?.count || 0)
  }

  private async countEndlessConditionContributors(userId: number) {
    const table = 'endless_challenge_conditions'
    if (!(await this.tableExists(table, this.dataSource.manager))) return 0

    const rows = await this.dataSource.manager.query(
      `SELECT \`contributors\` FROM \`${table}\` WHERE \`contributors\` IS NOT NULL`,
    )
    return rows.filter(row => {
      const contributors = typeof row.contributors === 'string' ? JSON.parse(row.contributors) : row.contributors
      return Array.isArray(contributors) && contributors.some(contributor => contributor?.userId === userId)
    }).length
  }

  private async tableExists(table: string, manager: EntityManager) {
    const cached = this.tableExistsCache.get(table)
    if (cached !== undefined) return cached

    const rows = await manager.query(
      'SELECT COUNT(*) count FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?',
      [table],
    )
    const exists = Number(rows[0]?.count || 0) > 0
    this.tableExistsCache.set(table, exists)
    return exists
  }
}
