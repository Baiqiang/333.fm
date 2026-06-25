import { Logger } from '@nestjs/common'
import { Command, CommandRunner } from 'nest-commander'

import { LeaveSliceCommandService } from './leave-slice.service'

@Command({ name: 'leave-slice', description: 'Leave Slice case generation' })
export class LeaveSliceCommand extends CommandRunner {
  private readonly logger = new Logger(LeaveSliceCommand.name)

  constructor(private readonly service: LeaveSliceCommandService) {
    super()
  }

  async run(passedParam: string[]): Promise<void> {
    switch (passedParam[0]) {
      case 'seed':
        await this.service.seed(parseInt(passedParam[1]) || 13)
        break
      case 'reset':
        await this.service.reset()
        break
      case 'stats':
        await this.service.printStats()
        break
      default:
        this.logger.warn('Usage: npm run cmd -- leave-slice seed [maxDepth]|reset|stats')
        break
    }
  }
}
