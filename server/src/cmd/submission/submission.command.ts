import { Logger } from '@nestjs/common'
import { Command, CommandRunner } from 'nest-commander'

import { SubmissionService } from './submission.service'

@Command({ name: 'submission', description: 'Submission analysis' })
export class SubmissionCommand extends CommandRunner {
  private readonly logger: Logger = new Logger(SubmissionCommand.name)

  constructor(private readonly submissionService: SubmissionService) {
    super()
  }

  async run(passedParam: string[]): Promise<void> {
    switch (passedParam[0]) {
      case 'analyze-comments':
        this.logger.log('Analyzing submission comments...')
        await this.submissionService.analyzeComments()
        break
      default:
        this.logger.warn(`Unknown subcommand: ${passedParam[0]}`)
        break
    }
  }
}
