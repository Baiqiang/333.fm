import * as readline from 'readline'

import { Injectable, Logger } from '@nestjs/common'
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm'
import { DataSource, Repository } from 'typeorm'

import { Role } from '@/auth/enums/role.enum'
import { CompetitionMode, Competitions } from '@/entities/competitions.entity'
import { DNF, Results } from '@/entities/results.entity'
import { Submissions } from '@/entities/submissions.entity'
import { UserRoles } from '@/entities/user-roles.entity'
import { Users } from '@/entities/users.entity'
import { setRanks } from '@/utils'

@Injectable()
export class BanService {
  private readonly logger = new Logger(BanService.name)

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @InjectRepository(Users)
    private readonly usersRepository: Repository<Users>,
    @InjectRepository(UserRoles)
    private readonly userRolesRepository: Repository<UserRoles>,
    @InjectRepository(Submissions)
    private readonly submissionsRepository: Repository<Submissions>,
    @InjectRepository(Results)
    private readonly resultsRepository: Repository<Results>,
  ) {}

  private async confirm(message: string): Promise<boolean> {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
    return new Promise(resolve => {
      rl.question(`${message} (y/N): `, answer => {
        rl.close()
        resolve(answer.trim().toLowerCase() === 'y')
      })
    })
  }

  async dnfUser(userIdOrWcaId: string): Promise<void> {
    const user = await this.findUser(userIdOrWcaId)
    if (!user) {
      this.logger.error(`User not found: ${userIdOrWcaId}`)
      process.exitCode = 1
      return
    }

    const submissions = await this.submissionsRepository.find({
      where: { userId: user.id },
      relations: { competition: true, scramble: true },
    })

    const results = await this.resultsRepository.find({
      where: { userId: user.id },
    })

    this.logger.log('=== User Info ===')
    this.logger.log(`ID: ${user.id}`)
    this.logger.log(`Name: ${user.name}`)
    this.logger.log(`WCA ID: ${user.wcaId || 'N/A'}`)
    this.logger.log(`Email: ${user.email}`)
    this.logger.log(`Source: ${user.source}`)
    this.logger.log(`Submissions: ${submissions.length}`)
    this.logger.log(`Results: ${results.length}`)

    const competitionIds = [...new Set(results.map(r => r.competitionId))]
    this.logger.log(`Affected competitions: ${competitionIds.length}`)

    if (submissions.length === 0 && results.length === 0) {
      this.logger.log('No submissions or results to DNF.')
      return
    }

    const confirmed = await this.confirm(
      `Are you sure you want to DNF ALL results for "${user.name}" (ID: ${user.id})?`,
    )
    if (!confirmed) {
      this.logger.log('Aborted.')
      return
    }

    await this.dataSource.transaction(async manager => {
      for (const result of results) {
        result.values = result.values.map(() => DNF)
        result.best = DNF
        result.average = DNF
        await manager.save(result)
      }

      for (const sub of submissions) {
        sub.moves = DNF
        await manager.save(sub)
      }

      for (const competitionId of competitionIds) {
        for (const mode of [CompetitionMode.REGULAR, CompetitionMode.UNLIMITED]) {
          const allResults = await manager.find(Results, {
            where: { competitionId, mode },
          })
          if (allResults.length > 0) {
            setRanks(allResults)
            await manager.save(allResults)
          }
        }
      }
    })

    this.logger.log(`DNF'd ${submissions.length} submissions and ${results.length} results.`)
    this.logger.log(`Recalculated rankings for ${competitionIds.length} competitions.`)
  }

  async banUser(userIdOrWcaId: string): Promise<void> {
    const user = await this.findUser(userIdOrWcaId)
    if (!user) {
      this.logger.error(`User not found: ${userIdOrWcaId}`)
      process.exitCode = 1
      return
    }

    const existingRole = await this.userRolesRepository.findOne({
      where: { userId: user.id, name: Role.Banned },
    })
    if (existingRole) {
      this.logger.warn(`User "${user.name}" (ID: ${user.id}) is already banned.`)
      return
    }

    this.logger.log('=== User Info ===')
    this.logger.log(`ID: ${user.id}`)
    this.logger.log(`Name: ${user.name}`)
    this.logger.log(`WCA ID: ${user.wcaId || 'N/A'}`)

    const confirmed = await this.confirm(`Are you sure you want to BAN "${user.name}" (ID: ${user.id})?`)
    if (!confirmed) {
      this.logger.log('Aborted.')
      return
    }

    const role = new UserRoles()
    role.userId = user.id
    role.name = Role.Banned
    await this.userRolesRepository.save(role)

    this.logger.log(`User "${user.name}" (ID: ${user.id}) has been banned.`)
  }

  async unbanUser(userIdOrWcaId: string): Promise<void> {
    const user = await this.findUser(userIdOrWcaId)
    if (!user) {
      this.logger.error(`User not found: ${userIdOrWcaId}`)
      process.exitCode = 1
      return
    }

    const existingRole = await this.userRolesRepository.findOne({
      where: { userId: user.id, name: Role.Banned },
    })
    if (!existingRole) {
      this.logger.warn(`User "${user.name}" (ID: ${user.id}) is not banned.`)
      return
    }

    await this.userRolesRepository.remove(existingRole)
    this.logger.log(`User "${user.name}" (ID: ${user.id}) has been unbanned.`)
  }

  private async findUser(idOrWcaId: string): Promise<Users | null> {
    const numId = Number(idOrWcaId)
    if (Number.isInteger(numId) && numId > 0) {
      return this.usersRepository.findOne({ where: { id: numId } })
    }
    if (/^\d{4}[A-Z]{4}\d{2}$/.test(idOrWcaId)) {
      return this.usersRepository.findOne({ where: { wcaId: idOrWcaId } })
    }
    return this.usersRepository.findOne({ where: { name: idOrWcaId } })
  }
}
