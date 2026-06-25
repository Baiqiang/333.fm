import { Logger } from '@nestjs/common'
import { Command, CommandRunner } from 'nest-commander'

import { PointService } from './point.service'

@Command({ name: 'point', description: 'Point calculation' })
export class PointCommand extends CommandRunner {
  private readonly logger: Logger = new Logger(PointCommand.name)
  constructor(private readonly pointService: PointService) {
    super()
  }

  async run(passedParam: string[]): Promise<void> {
    switch (passedParam[0]) {
      case 'calc':
        this.logger.log('Calculating points')
        await this.pointService.calculate()
        break
      default:
        break
    }
  }
}
