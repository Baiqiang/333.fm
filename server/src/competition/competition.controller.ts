import { Controller, Get, NotFoundException, Param, ParseIntPipe } from '@nestjs/common'

import { Competitions } from '@/entities/competitions.entity'

import { CompetitionService } from './competition.service'

@Controller('competition')
export class CompetitionController {
  constructor(private competitionService: CompetitionService) {}

  @Get('latest')
  public getLatest(): Promise<Competitions[]> {
    return this.competitionService.getLatest()
  }

  @Get(':id')
  public async getCompetition(@Param('id', ParseIntPipe) id: number): Promise<Competitions> {
    const competition = this.competitionService.findOne({ where: { id } })
    if (!competition) {
      throw new NotFoundException()
    }
    return competition
  }
}
