import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common'

import { AuthService } from '@/auth/auth.service'
import { CurrentUser } from '@/auth/decorators/current-user.decorator'
import { Roles } from '@/auth/decorators/roles.decorator'
import { Role } from '@/auth/enums/role.enum'
import { DevGuard } from '@/auth/guards/dev.guard'
import { JwtRequiredGuard } from '@/auth/guards/jwt-required.guard'
import { RolesGuard } from '@/auth/guards/roles.guard'
import { AdminAddSubmissionDto } from '@/dtos/admin-add-submission.dto'
import { LeaguePlayerDto } from '@/dtos/league-player.dto'
import { CompetitionStatus } from '@/entities/competitions.entity'
import { LeagueSeasonStatus } from '@/entities/league-seasons.entity'
import { Users } from '@/entities/users.entity'
import { UserService } from '@/user/user.service'

import { LeagueService } from '../league.service'

@Controller('league/admin')
@UseGuards(JwtRequiredGuard, RolesGuard)
@Roles(Role.LeagueAdmin)
export class AdminController {
  constructor(
    private readonly leagueService: LeagueService,
    private readonly userService: UserService,
    private readonly authService: AuthService,
  ) {}

  @Post('signin-as')
  @UseGuards(DevGuard)
  async signInAs(@Body('wcaId') wcaId: string) {
    const user = await this.userService.findOne(wcaId)
    if (!user) {
      throw new BadRequestException('User does not exist')
    }
    return this.authService.wcaSignIn(user)
  }

  @Get('seasons')
  async getSeasons() {
    return this.leagueService.getSeasons()
  }

  @Get('season/:number')
  async getSeason(@Param('number', ParseIntPipe) number: number) {
    return this.leagueService.getSeason(number)
  }

  @Post('season')
  async createSeason(
    @Body('number') number: number,
    @Body('startTime') startTime: string,
    @Body('weeks') weeks: number,
    @Body('numTiers') numTiers: number,
    @CurrentUser() user: Users,
  ) {
    const season = await this.leagueService.createSeason(number, startTime, weeks)
    const competitions = await this.leagueService.createCompetitions(season, user, weeks, startTime)
    const tiers = await this.leagueService.createTiers(season, numTiers)
    season.competitions = competitions
    season.tiers = tiers
    return season
  }

  @Delete('season/:number')
  @UseGuards(DevGuard)
  async deleteSeason(@Param('number', ParseIntPipe) number: number) {
    const season = await this.leagueService.getSeason(number)
    if (!season) {
      throw new NotFoundException('Season not found')
    }
    await this.leagueService.deleteSeason(season)
    return {
      message: 'Season deleted',
    }
  }

  @Post('season/:number/players')
  async pickPlayers(
    @Param('number', ParseIntPipe) number: number,
    @Body('tierId') tierId: number,
    @Body('players') players: LeaguePlayerDto[],
  ) {
    const season = await this.leagueService.getSeason(number)
    if (!season) {
      throw new NotFoundException('Season not found')
    }
    const tier = await this.leagueService.getTier(season, tierId)
    if (!tier) {
      throw new NotFoundException('Tier not found')
    }
    await this.leagueService.pickPlayers(tier, players)
    return {
      tier,
      players,
    }
  }

  @Get('season/:number/schedules')
  async getSchedules(@Param('number', ParseIntPipe) number: number) {
    const season = await this.leagueService.getSeason(number)
    if (!season) {
      throw new NotFoundException('Season not found')
    }
    const schedules = await this.leagueService.getSchedules(season)
    return schedules
  }

  @Post('season/:number/schedules')
  async generateSchedules(@Param('number', ParseIntPipe) number: number) {
    const season = await this.leagueService.getSeason(number)
    if (!season) {
      throw new NotFoundException('Season not found')
    }
    const currentSchedules = await this.leagueService.getSchedules(season)
    if (
      currentSchedules.length !== 0 &&
      (season.status !== LeagueSeasonStatus.NOT_STARTED ||
        season.competitions.some(competition => competition.status !== CompetitionStatus.NOT_STARTED))
    ) {
      throw new BadRequestException('Schedules exist and can not regenerate')
    }
    await this.leagueService.getOrCreateStandings(season)
    const schedules = await this.leagueService.generateSchedules(season)
    return schedules
  }

  @Get('season/:number/participants')
  async getParticipants(@Param('number', ParseIntPipe) number: number) {
    const season = await this.leagueService.getSeason(number)
    if (!season) {
      throw new NotFoundException('Season not found')
    }
    const participants = await this.leagueService.getParticipants(season)
    return participants
  }

  @Post('season/:number/add-submission')
  async addSubmission(@Body() dto: AdminAddSubmissionDto) {
    const submission = await this.leagueService.adminAddSubmission(
      dto.scrambleId,
      dto.userId,
      dto.solution,
      dto.comment,
    )
    return submission
  }

  @Get('season/:number/:week')
  async getSeasonCompetition(@Param('number', ParseIntPipe) number: number, @Param('week', ParseIntPipe) week: number) {
    const season = await this.leagueService.getSeason(number)
    if (!season) {
      throw new NotFoundException('Season not found')
    }
    const competition = await this.leagueService.getSeasonCompetition(season, week)
    if (!competition) {
      throw new NotFoundException('Competition not found')
    }
    return competition
  }

  @Post('season/:number/:week/start')
  @UseGuards(DevGuard)
  async startSeasonCompetition(
    @Param('number', ParseIntPipe) number: number,
    @Param('week', ParseIntPipe) week: number,
  ) {
    const season = await this.leagueService.getSeason(number)
    if (!season) {
      throw new NotFoundException('Season not found')
    }
    const competition = await this.leagueService.getSeasonCompetition(season, week)
    if (!competition) {
      throw new NotFoundException('Competition not found')
    }
    await this.leagueService.startCompetition(competition)
    await this.leagueService.startSeason(season)
    return competition
  }

  @Post('season/:number/:week/end')
  @UseGuards(DevGuard)
  async endSeasonCompetition(@Param('number', ParseIntPipe) number: number, @Param('week', ParseIntPipe) week: number) {
    const season = await this.leagueService.getSeason(number)
    if (!season) {
      throw new NotFoundException('Season not found')
    }
    const competition = await this.leagueService.getSeasonCompetition(season, week)
    if (!competition) {
      throw new NotFoundException('Competition not found')
    }
    await this.leagueService.endCompetition(competition)
    return competition
  }

  @Post('season/:number/:week/scrambles')
  async importScrambles(
    @Param('number', ParseIntPipe) number: number,
    @Param('week', ParseIntPipe) week: number,
    @Body('scrambles') scrambleStrings: string[],
  ) {
    const season = await this.leagueService.getSeason(number)
    if (!season) {
      throw new NotFoundException('Season not found')
    }
    const competition = await this.leagueService.getSeasonCompetition(season, week)
    if (!competition) {
      throw new NotFoundException('Competition not found')
    }
    // check if competition has started
    if (competition.hasStarted && competition.scrambles.length > 0) {
      throw new BadRequestException('Competition has already started')
    }
    const scrambles = await this.leagueService.updateScrambles(competition, scrambleStrings)
    return {
      competition,
      scrambles,
    }
  }

  @Post('season/:number/:week/generate-scrambles')
  async generateScrambles(@Param('number', ParseIntPipe) number: number, @Param('week', ParseIntPipe) week: number) {
    const season = await this.leagueService.getSeason(number)
    if (!season) {
      throw new NotFoundException('Season not found')
    }
    const competition = await this.leagueService.getSeasonCompetition(season, week)
    if (!competition) {
      throw new NotFoundException('Competition not found')
    }
    // check if competition has started
    if (competition.hasStarted && competition.scrambles.length > 0) {
      throw new BadRequestException('Competition has already started')
    }
    const scrambles = await this.leagueService.generateScrambles(competition)
    return {
      competition,
      scrambles,
    }
  }
}
