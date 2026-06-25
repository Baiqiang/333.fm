import { Logger } from '@nestjs/common'
import { Command, CommandRunner } from 'nest-commander'

import { CenterSolvedCommandService } from './center-solved.service'

@Command({ name: 'center-solved', description: 'Analyze center-restored submissions' })
export class CenterSolvedCommand extends CommandRunner {
  private readonly logger = new Logger(CenterSolvedCommand.name)

  constructor(private readonly service: CenterSolvedCommandService) {
    super()
  }

  async run(passedParam: string[]): Promise<void> {
    switch (passedParam[0]) {
      case 'analyze': {
        const baseUrlArg = passedParam.find(p => p.startsWith('--base-url='))
        const baseUrl = baseUrlArg?.slice('--base-url='.length) || process.env.BASE_URL || 'https://333.fm'
        this.logger.log('Analyzing center-restored submissions...')
        await this.service.analyze(baseUrl)
        break
      }
      default:
        this.logger.warn('Usage: npm run cmd -- center-solved analyze [--base-url=https://333.fm]')
        break
    }
  }
}
