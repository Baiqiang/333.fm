import { Logger } from '@nestjs/common'
import { Command, CommandRunner } from 'nest-commander'

import { EndlessCommandService } from './endless.service'

@Command({ name: 'endless', description: 'Endless management' })
export class EndlessCommand extends CommandRunner {
  private readonly logger = new Logger(EndlessCommand.name)

  constructor(private readonly endlessCommandService: EndlessCommandService) {
    super()
  }

  async run(passedParam: string[]): Promise<void> {
    switch (passedParam[0]) {
      case 'open-boss':
        await this.endlessCommandService.openBoss(passedParam[1], passedParam[2], passedParam[3])
        break
      case 'open-challenge':
        await this.endlessCommandService.openChallenge(passedParam[1], passedParam[2], passedParam[3], passedParam[4])
        break
      case 'simulate-old-boss':
        await this.endlessCommandService.simulateOldBoss(passedParam[1], passedParam[2] ? Number(passedParam[2]) : 1000)
        break
      case 'simulate-challenge':
        await this.endlessCommandService.simulateChallenge(
          passedParam[1],
          passedParam[2] ? Number(passedParam[2]) : 1000,
        )
        break
      case 'retry-job':
        await this.endlessCommandService.retryJobs(passedParam.slice(1))
        break
      case 'end':
        await this.endlessCommandService.end(passedParam[1])
        break
      case 'boss-stats':
        await this.endlessCommandService.printBossStats(passedParam[1])
        break
      case 'fix-boss-long-damage':
        await this.endlessCommandService.fixBossLongMoveDamage(passedParam[1])
        break
      case 'fix-boss-instant-kills':
        await this.endlessCommandService.fixBossInstantKills(passedParam[1])
        break
      default:
        this.logger.warn('Usage: npm run cmd -- endless open-boss <alias> [startTime] [endTime]')
        this.logger.warn('   or: npm run cmd -- endless open-challenge <alias> [name] [startTime] [endTime]')
        this.logger.warn('   or: npm run cmd -- endless simulate-old-boss <alias> [runs]')
        this.logger.warn('   or: npm run cmd -- endless simulate-challenge <oldBossAlias> [runs]')
        this.logger.warn('   or: npm run cmd -- endless retry-job <submissionId...>')
        this.logger.warn('   or: npm run cmd -- endless end <alias>')
        this.logger.warn('   or: npm run cmd -- endless boss-stats <alias>')
        this.logger.warn('   or: npm run cmd -- endless fix-boss-long-damage <alias>')
        this.logger.warn('   or: npm run cmd -- endless fix-boss-instant-kills <alias>')
        break
    }
  }
}
