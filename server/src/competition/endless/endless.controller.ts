import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common'

import { CurrentUser } from '@/auth/decorators/current-user.decorator'
import { BannedGuard } from '@/auth/guards/banned.guard'
import { JwtAuthGuard } from '@/auth/guards/jwt.guard'
import { JwtRequiredGuard } from '@/auth/guards/jwt-required.guard'
import { SubmitSolutionDto } from '@/dtos/submit-solution.dto'
import { CompetitionSubType } from '@/entities/competitions.entity'
import { Users } from '@/entities/users.entity'
import { UserService } from '@/user/user.service'

import { EndlessService } from './endless.service'

@Controller('endless')
export class EndlessController {
  constructor(
    private readonly endlessService: EndlessService,
    private readonly userService: UserService,
  ) {}

  @Get('latest')
  public async getLatest() {
    return this.endlessService.getLatest()
  }

  @Get('on-going')
  public async getOnGoing(@Query('type') subType: CompetitionSubType) {
    if (!subType) {
      subType = undefined
    }
    return this.endlessService.getOnGoing(subType)
  }

  @Get('ended')
  public async getEnded(@Query('type') subType: CompetitionSubType) {
    if (!subType) {
      subType = undefined
    }
    return this.endlessService.getEnded(subType)
  }

  @Get(':season')
  async getSeason(@Param('season') season: string) {
    const competition = await this.endlessService.getBySeason(season)
    if (!competition) {
      throw new NotFoundException()
    }
    return competition
  }

  @Get(':season/stats')
  async getStats(@Param('season') season: string) {
    const competition = await this.endlessService.getBySeason(season)
    if (!competition) {
      throw new NotFoundException()
    }
    return await this.endlessService.getStats(competition)
  }

  @Get(':season/progress')
  @UseGuards(JwtRequiredGuard)
  async progress(@Param('season') season: string, @CurrentUser() user: Users) {
    const competition = await this.endlessService.getBySeason(season)
    if (!competition) {
      throw new NotFoundException()
    }
    return this.endlessService.getProgress(competition, user)
  }

  @Get(':season/user-stats')
  @UseGuards(JwtRequiredGuard)
  async getUserStats(@Param('season') season: string, @CurrentUser() user: Users) {
    const competition = await this.endlessService.getBySeason(season)
    if (!competition) {
      throw new NotFoundException()
    }
    return this.endlessService.getUserStats(competition, user)
  }

  @Get(':season/:level')
  @UseGuards(JwtAuthGuard)
  async level(
    @Param('season') season: string,
    @Param('level', new DefaultValuePipe(1), ParseIntPipe) level: number,
    @CurrentUser() user: Users,
  ) {
    const competition = await this.endlessService.getBySeason(season)
    if (!competition) {
      throw new NotFoundException()
    }
    return this.endlessService.getLevel(competition, user, level)
  }

  @Post(':season')
  @UseGuards(JwtAuthGuard, BannedGuard)
  async submit(@Param('season') season: string, @CurrentUser() user: Users, @Body() solution: SubmitSolutionDto) {
    const competition = await this.endlessService.getBySeason(season)
    if (!competition) {
      throw new NotFoundException()
    }
    return this.endlessService.submitSolution(competition, user, solution)
  }

  @Post(':season/:id')
  @UseGuards(JwtRequiredGuard)
  public async update(
    @Param('season') season: string,
    @Param('id', ParseIntPipe) submissionId: number,
    @CurrentUser() user: Users,
    @Body() solution: Pick<SubmitSolutionDto, 'comment' | 'mode' | 'attachments'>,
  ) {
    const competition = await this.endlessService.getBySeason(season)
    if (!competition) {
      throw new NotFoundException()
    }
    return await this.endlessService.update(competition, user, submissionId, solution)
  }

  @Get(':season/:level/submissions')
  @UseGuards(JwtRequiredGuard)
  async submissions(
    @Param('season') season: string,
    @Param('level', new DefaultValuePipe(1), ParseIntPipe) level: number,
    @CurrentUser() user: Users,
  ) {
    const competition = await this.endlessService.getBySeason(season)
    if (!competition) {
      throw new NotFoundException()
    }
    const submissions = await this.endlessService.getLevelSubmissions(competition, user, level)
    if (user) {
      await this.userService.loadUserActivities(user, submissions)
    }
    return submissions
  }
}
