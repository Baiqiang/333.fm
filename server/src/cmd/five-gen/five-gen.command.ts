import { Logger } from '@nestjs/common'
import { Command, CommandRunner } from 'nest-commander'

import { FiveGenCommandService } from './five-gen.service'

@Command({ name: 'five-gen', description: 'Analyze 5gen submissions (solutions using exactly 5 faces)' })
export class FiveGenCommand extends CommandRunner {
  private readonly logger = new Logger(FiveGenCommand.name)

  constructor(private readonly service: FiveGenCommandService) {
    super()
  }

  async run(passedParam: string[]): Promise<void> {
    switch (passedParam[0]) {
      case 'analyze': {
        const baseUrlArg = passedParam.find(p => p.startsWith('--base-url='))
        const baseUrl = baseUrlArg?.slice('--base-url='.length) || process.env.BASE_URL || 'https://333.fm'
        this.logger.log('Analyzing 5gen submissions...')
        await this.service.analyze(baseUrl)
        break
      }
      default:
        this.logger.warn('Usage: npm run cmd -- five-gen analyze [--base-url=https://333.fm]')
        break
    }
  }
}
