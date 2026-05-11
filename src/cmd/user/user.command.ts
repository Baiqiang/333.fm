import { Logger } from '@nestjs/common'
import { Command, CommandRunner } from 'nest-commander'

import { UserService } from './user.service'

@Command({ name: 'user', description: 'User management' })
export class UserCommand extends CommandRunner {
  private readonly logger: Logger = new Logger(UserCommand.name)
  constructor(private readonly userService: UserService) {
    super()
  }

  async run(passedParam: string[]): Promise<void> {
    switch (passedParam[0]) {
      case 'merge':
        await this.userService.merge()
        break
      case 'check-merge':
      case 'merge-check':
      case 'verify-merge':
        await this.userService.checkMerge()
        break
      case 'migrate-data':
      case 'migrate-user-data':
        await this.migrateUserData(passedParam[1], passedParam[2])
        break
      case 'backfill-primary':
        await this.userService.backfillPrimaryUserId()
        break
      default:
        break
    }
  }

  private async migrateUserData(fromUserIdParam?: string, toUserIdParam?: string) {
    const fromUserId = Number(fromUserIdParam)
    const toUserId = Number(toUserIdParam)
    if (!Number.isInteger(fromUserId) || !Number.isInteger(toUserId) || fromUserId <= 0 || toUserId <= 0) {
      this.logger.error('Usage: npm run cmd -- user migrate-data <fromUserId> <toUserId>')
      process.exitCode = 1
      return
    }

    await this.userService.migrateUserData(fromUserId, toUserId)
  }
}
