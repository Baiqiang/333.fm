import { Logger } from '@nestjs/common'
import { Command, CommandRunner } from 'nest-commander'

import { DRTriggerCommandService } from './dr-trigger.service'

@Command({ name: 'dr-trigger', description: 'DR Trigger management' })
export class DRTriggerCommand extends CommandRunner {
  private readonly logger = new Logger(DRTriggerCommand.name)

  constructor(private readonly service: DRTriggerCommandService) {
    super()
  }

  async run(passedParam: string[]): Promise<void> {
    switch (passedParam[0]) {
      case 'seed':
        await this.service.seed()
        break
      case 'symmetry':
        await this.service.analyzeSymmetry(parseInt(passedParam[1]) || 6)
        break
      case 'count-table':
        await this.service.printCountTable()
        break
      case 'reset':
        await this.service.reset()
        break
      case 'fix-eo':
        await this.service.fixEoBreaking()
        break
      case 'compute-symmetry':
        await this.service.computeSymmetryGroups()
        break
      case 'update-representatives':
        await this.service.updateRepresentatives()
        break
      default:
        this.logger.warn(
          'Usage: npm run cmd -- dr-trigger seed|symmetry [maxMoves]|count-table|reset|fix-eo|compute-symmetry|update-representatives',
        )
        break
    }
  }
}
