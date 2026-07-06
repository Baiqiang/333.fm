import { Body, Controller, Get, NotFoundException, Param, ParseIntPipe, Post, Query, UseGuards } from '@nestjs/common'

import { CurrentUser } from '@/auth/decorators/current-user.decorator'
import { BannedGuard } from '@/auth/guards/banned.guard'
import { JwtAuthGuard } from '@/auth/guards/jwt.guard'
import { JwtRequiredGuard } from '@/auth/guards/jwt-required.guard'
import { PaginationDto } from '@/dtos/pagination.dto'
import { SubmitSolutionDto } from '@/dtos/submit-solution.dto'
import { CompetitionMode } from '@/entities/competitions.entity'
import { Users } from '@/entities/users.entity'

import { CompetitionService } from '../competition.service'
import { FunChallengeService } from './fun-challenge.service'

@Controller('fun-challenges')
export class FunChallengeController {
  constructor(
    private readonly funChallengeService: FunChallengeService,
    private readonly competitionService: CompetitionService,
  ) {}

  @Get()
  public async getCompetitions(@Query() { page, limit }: PaginationDto) {
    return this.funChallengeService.getCompetitions({ page, limit })
  }

  @Get('on-going')
  public async getOnGoing() {
    const competition = await this.funChallengeService.getOnGoing()
    if (!competition) {
      throw new NotFoundException()
    }
    return competition
  }

  @Get(':alias')
  public async getCompetition(@Param('alias') alias: string) {
    const competition = await this.funChallengeService.getCompetition(alias)
    if (!competition) {
      throw new NotFoundException()
    }
    return competition
  }

  @Get(':alias/results')
  public async getResults(@Param('alias') alias: string) {
    const competition = await this.funChallengeService.getCompetition(alias)
    if (!competition) {
      throw new NotFoundException()
    }
    const regular = await this.competitionService.getResults(competition, { mode: CompetitionMode.REGULAR })
    const unlimited = await this.competitionService.getResults(competition, { mode: CompetitionMode.UNLIMITED })
    return {
      regular,
      unlimited,
    }
  }

  @Post(':alias')
  @UseGuards(JwtRequiredGuard, BannedGuard)
  public async submit(@Param('alias') alias: string, @CurrentUser() user: Users, @Body() solution: SubmitSolutionDto) {
    const competition = await this.funChallengeService.getCompetition(alias)
    if (!competition) {
      throw new NotFoundException()
    }
    return await this.funChallengeService.submitSolution(competition, user, solution)
  }

  @Post(':alias/:id')
  @UseGuards(JwtRequiredGuard)
  public async update(
    @Param('alias') alias: string,
    @Param('id', ParseIntPipe) submissionId: number,
    @CurrentUser() user: Users,
    @Body() solution: Pick<SubmitSolutionDto, 'comment' | 'attachments'>,
  ) {
    const competition = await this.funChallengeService.getCompetition(alias)
    if (!competition) {
      throw new NotFoundException()
    }
    await this.funChallengeService.update(competition, user, submissionId, solution)
    return true
  }

  @Post(':alias/:id/unlimited')
  @UseGuards(JwtRequiredGuard)
  public async toUnlimited(
    @Param('alias') alias: string,
    @Param('id', ParseIntPipe) submissionId: number,
    @CurrentUser() user: Users,
  ) {
    const competition = await this.funChallengeService.getCompetition(alias)
    if (!competition) {
      throw new NotFoundException()
    }
    await this.funChallengeService.turnToUnlimited(competition, user, submissionId)
    return true
  }

  @Get(':alias/submissions')
  @UseGuards(JwtAuthGuard)
  public async getSubmissions(@CurrentUser() user: Users, @Param('alias') alias: string) {
    const competition = await this.funChallengeService.getCompetition(alias)
    if (!competition) {
      throw new NotFoundException()
    }
    const { mappedSubmissions } = await this.competitionService.getSubmissions(competition, user)
    return mappedSubmissions
  }
}
