import { Logger } from '@nestjs/common'
import { Command, CommandRunner } from 'nest-commander'

import { LeagueService } from './league.service'

@Command({ name: 'league', description: 'League calculation' })
export class LeagueCommand extends CommandRunner {
  private readonly logger: Logger = new Logger(LeagueCommand.name)
  constructor(private readonly leagueService: LeagueService) {
    super()
  }

  async run(passedParam: string[]): Promise<void> {
    console.log(passedParam)
    switch (passedParam[0]) {
      case 'import':
        this.logger.log('Importing past leagues')
        await this.leagueService.import(passedParam[1], parseInt(passedParam[2]), passedParam[3])
        break
      case 'elo':
        this.logger.log('Calculating league elos for entire season')
        await this.leagueService.calcualteElo(Number(passedParam[1]))
        break
      case 'elo-week':
        this.logger.log(`Calculating ELO for S${passedParam[1]} Week ${passedParam[2]}`)
        await this.leagueService.calculateWeekElo(Number(passedParam[1]), Number(passedParam[2]))
        break
      case 'import-elo':
        this.logger.log(`Importing ELO from ${passedParam[1]} for S${passedParam[2]}`)
        await this.leagueService.importElo(passedParam[1], Number(passedParam[2]))
        break
      case 'dnf-result':
        this.logger.log(`DNFing result for ${passedParam[3]} in S${passedParam[1]} Week ${passedParam[2]}`)
        await this.leagueService.dnfResult(Number(passedParam[1]), Number(passedParam[2]), passedParam[3])
        break
      case 'extend-week':
        this.logger.log(`Extending S${passedParam[1]} Week ${passedParam[2]} by ${passedParam[3] ?? 1} week(s)`)
        await this.leagueService.extendWeek(
          Number(passedParam[1]),
          Number(passedParam[2]),
          passedParam[3] !== undefined ? Number(passedParam[3]) : 1,
        )
        break
      default:
        break
    }
  }
}
