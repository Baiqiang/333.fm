import { Logger } from '@nestjs/common'
import { Command, CommandRunner } from 'nest-commander'

import { WcaService } from './wca.service'

@Command({ name: 'wca', description: 'WCA data management' })
export class WcaCommand extends CommandRunner {
  private readonly logger: Logger = new Logger(WcaCommand.name)
  constructor(private readonly wcaService: WcaService) {
    super()
  }

  async run(passedParam: string[]): Promise<void> {
    switch (passedParam[0]) {
      case 'fix-dates':
        this.logger.log('Fixing WCA competition dates')
        await this.wcaService.fixCompetitionDates()
        break
      default:
        this.logger.warn(`Unknown command: ${passedParam[0]}`)
        break
    }
  }
}
