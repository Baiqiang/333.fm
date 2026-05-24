import { Body, Controller, Get, NotFoundException, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common'
import { ApiBearerAuth } from '@nestjs/swagger'

import { CurrentUser } from '@/auth/decorators/current-user.decorator'
import { BannedGuard } from '@/auth/guards/banned.guard'
import { JwtAuthGuard } from '@/auth/guards/jwt.guard'
import { JwtRequiredGuard } from '@/auth/guards/jwt-required.guard'
import { SubmitSolutionDto } from '@/dtos/submit-solution.dto'
import { CompetitionMode } from '@/entities/competitions.entity'
import { Users } from '@/entities/users.entity'

import { CompetitionService } from '../competition.service'
import { LeagueService } from './league.service'

@Controller('league')
export class LeagueController {
  constructor(
    private readonly leagueService: LeagueService,
    private readonly competitionService: CompetitionService,
  ) {}

  @Get('seasons')
  async getSeasons() {
    return this.leagueService.getSeasons()
  }

  @Get('seasons/past')
  async getPastSeasons() {
    return this.leagueService.getPastSeasons()
  }

  @Get('season/on-going')
  async getOnGoingSeason() {
    const season = await this.leagueService.getOnGoing()
    if (!season) {
      throw new NotFoundException()
    }
    this.leagueService.hideScrambles(season)
    return season
  }

  @Get('season/next')
  async getNextSeason() {
    const season = await this.leagueService.getNext()
    if (!season) {
      throw new NotFoundException()
    }
    this.leagueService.hideScrambles(season)
    return season
  }

  @Get('season/:number')
  async getSeason(@Param('number', ParseIntPipe) number: number) {
    const season = await this.leagueService.getSeason(number)
    if (!season) {
      throw new NotFoundException('Season not found')
    }
    this.leagueService.hideScrambles(season)
    return season
  }

  @Get('season/:number/schedules')
  @UseGuards(JwtAuthGuard)
  async getSchedules(@Param('number', ParseIntPipe) number: number, @CurrentUser() user: Users) {
    const season = await this.leagueService.getSeason(number)
    if (!season) {
      throw new NotFoundException('Season not found')
    }
    const schedules = await this.leagueService.getSchedules(season, user)
    return schedules
  }

  @Get('season/:number/standings')
  async getStandings(@Param('number', ParseIntPipe) number: number) {
    const season = await this.leagueService.getSeason(number)
    if (!season) {
      throw new NotFoundException('Season not found')
    }
    const standings = await this.leagueService.getStandings(season)
    return standings
  }

  @Get('season/:number/update-standings')
  async updateStandings(@Param('number', ParseIntPipe) number: number) {
    const season = await this.leagueService.getSeason(number)
    if (!season) {
      throw new NotFoundException('Season not found')
    }
    return await this.leagueService.updateAllStandingsRanksings(season)
  }

  @Get('season/:number/results')
  async getResults(@Param('number', ParseIntPipe) number: number) {
    const season = await this.leagueService.getSeason(number)
    if (!season) {
      throw new NotFoundException('Season not found')
    }
    const results = await this.leagueService.getResults(season)
    return results
  }

  @Get('season/:number/solves')
  async getSolves(@Param('number', ParseIntPipe) number: number) {
    const season = await this.leagueService.getSeason(number)
    if (!season) {
      throw new NotFoundException('Season not found')
    }
    const solves = await this.leagueService.getSolves(season)
    return solves
  }

  @Get('season/:number/tiers')
  async getTiers(@Param('number', ParseIntPipe) number: number) {
    const season = await this.leagueService.getSeason(number)
    if (!season) {
      throw new NotFoundException('Season not found')
    }
    const tiers = await this.leagueService.getTiers(season)
    return tiers
  }

  @Get('season/:number/participated')
  @ApiBearerAuth()
  @UseGuards(JwtRequiredGuard)
  async getParticipated(@Param('number', ParseIntPipe) number: number, @CurrentUser() user: Users) {
    const season = await this.leagueService.getSeason(number)
    if (!season) {
      throw new NotFoundException('Season not found')
    }
    const participant = await this.leagueService.getParticipant(season, user)
    return participant
  }

  @Post('season/:number/participate')
  @ApiBearerAuth()
  @UseGuards(JwtRequiredGuard)
  async participate(@Param('number', ParseIntPipe) number: number, @CurrentUser() user: Users) {
    const season = await this.leagueService.getSeason(number)
    if (!season) {
      throw new NotFoundException('Season not found')
    }
    await this.leagueService.participate(season, user)
    return true
  }

  @Post('season/:number/unparticipate')
  @ApiBearerAuth()
  @UseGuards(JwtRequiredGuard)
  async unparticipate(@Param('number', ParseIntPipe) number: number, @CurrentUser() user: Users) {
    const season = await this.leagueService.getSeason(number)
    if (!season) {
      throw new NotFoundException('Season not found')
    }
    await this.leagueService.unparticipate(season, user)
    return true
  }

  @Get('season/:number/:week/schedules')
  @UseGuards(JwtAuthGuard)
  async getWeekSchedules(
    @Param('number', ParseIntPipe) number: number,
    @Param('week', ParseIntPipe) week: number,
    @CurrentUser() user: Users,
  ) {
    const season = await this.leagueService.getSeason(number)
    if (!season) {
      throw new NotFoundException('Season not found')
    }
    const competition = await this.leagueService.getSeasonCompetition(season, week)
    if (!competition) {
      throw new NotFoundException('Competition not found')
    }
    const schedules = await this.leagueService.getWeekSchedules(season, competition, user)
    return schedules
  }

  @Get('season/:number/:week/submissions')
  @UseGuards(JwtAuthGuard)
  async getWeekSubmissions(
    @Param('number', ParseIntPipe) number: number,
    @Param('week', ParseIntPipe) week: number,
    @CurrentUser() user: Users,
  ) {
    const season = await this.leagueService.getSeason(number)
    if (!season) {
      throw new NotFoundException('Season not found')
    }
    const competition = await this.leagueService.getSeasonCompetition(season, week)
    if (!competition) {
      throw new NotFoundException('Competition not found')
    }
    // return blank list if competition hasn't ended
    if (!user && !competition.hasEnded) {
      return []
    }
    const { submissions, mappedSubmissions } = await this.competitionService.getSubmissions(competition, user)
    if (!competition.hasEnded) {
      const duel = await this.leagueService.getWeekDuel(competition, user)
      if (duel) {
        const opponent = duel.getOpponent(user)
        if (submissions.filter(s => s.userId === user.id).length < 3) {
          Object.entries(mappedSubmissions).forEach(([scrambleId, submissions]) => {
            mappedSubmissions[scrambleId] = submissions.filter(s => s.userId !== opponent.id)
          })
        }
      }
    }
    return mappedSubmissions
  }

  @Get('season/:number/:week/results')
  async getWeekResults(@Param('number', ParseIntPipe) number: number, @Param('week', ParseIntPipe) week: number) {
    const season = await this.leagueService.getSeason(number)
    if (!season) {
      throw new NotFoundException('Season not found')
    }
    const competition = await this.leagueService.getSeasonCompetition(season, week)
    if (!competition) {
      throw new NotFoundException('Competition not found')
    }
    if (!competition.hasEnded) {
      return {
        regular: [],
        unlimited: [],
      }
    }
    const regular = await this.competitionService.getResults(competition, { mode: CompetitionMode.REGULAR })
    const unlimited = await this.competitionService.getResults(competition, { mode: CompetitionMode.UNLIMITED })
    return {
      regular,
      unlimited,
    }
  }

  @Get('season/:number/:week')
  async getSeasonCompetition(@Param('number', ParseIntPipe) number: number, @Param('week', ParseIntPipe) week: number) {
    const season = await this.leagueService.getSeason(number)
    if (!season) {
      throw new NotFoundException()
    }
    this.leagueService.hideScrambles(season)
    return season.competitions.find(c => c.alias === `league-${number}-${week}`)
  }

  @Post('season/:number/:alias')
  @ApiBearerAuth()
  @UseGuards(JwtRequiredGuard, BannedGuard)
  public async submit(
    @Param('number', ParseIntPipe) number: number,
    @Param('alias') alias: string,
    @CurrentUser() user: Users,
    @Body() solution: SubmitSolutionDto,
  ) {
    const season = await this.leagueService.getSeason(number)
    if (!season) {
      throw new NotFoundException('Season not found')
    }
    const competition = await this.leagueService.getSeasonCompetitionByAlias(season, alias)
    if (!competition) {
      throw new NotFoundException('Competition not found')
    }
    // check player
    // const player = await this.leagueService.getPlayer(season, user)
    // if (!player) {
    //   throw new NotFoundException('Player not found')
    // }
    return await this.leagueService.submitSolution(competition, user, solution)
  }

  @Post('season/:number/:alias/:id')
  @ApiBearerAuth()
  @UseGuards(JwtRequiredGuard)
  public async update(
    @Param('number', ParseIntPipe) number: number,
    @Param('alias') alias: string,
    @Param('id', ParseIntPipe) submissionId: number,
    @CurrentUser() user: Users,
    @Body() solution: Pick<SubmitSolutionDto, 'comment' | 'attachments'>,
  ) {
    const season = await this.leagueService.getSeason(number)
    if (!season) {
      throw new NotFoundException('Season not found')
    }
    const competition = await this.leagueService.getSeasonCompetitionByAlias(season, alias)
    if (!competition) {
      throw new NotFoundException('Competition not found')
    }
    await this.leagueService.update(competition, user, submissionId, solution)
    return true
  }
}
