import {
  Body,
  ConflictException,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common'
import { ApiBearerAuth } from '@nestjs/swagger'

import { CurrentUser } from '@/auth/decorators/current-user.decorator'
import { BannedGuard } from '@/auth/guards/banned.guard'
import { JwtAuthGuard } from '@/auth/guards/jwt.guard'
import { JwtOrBotRequiredGuard } from '@/auth/guards/jwt-or-bot-required.guard'
import { CreateCompetitionDto } from '@/dtos/create-comptition.dto'
import { SubmitSolutionDto } from '@/dtos/submit-solution.dto'
import { UpdatePracticeDescriptionDto } from '@/dtos/update-practice-description.dto'
import { CompetitionFormat } from '@/entities/competitions.entity'
import { Users } from '@/entities/users.entity'
import { UserService } from '@/user/user.service'

import { CompetitionService } from '../competition.service'
import { DailyService } from '../daily/daily.service'
import { PracticeService } from './practice.service'

@Controller('practice')
export class PracticeController {
  constructor(
    private readonly practiceService: PracticeService,
    private readonly competitionService: CompetitionService,
    private readonly userService: UserService,
    private readonly dailyService: DailyService,
  ) {}

  @Get()
  async index() {
    const data = await this.practiceService.getIndexInfo()
    return data
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtOrBotRequiredGuard, BannedGuard)
  async create(@Body() dto: CreateCompetitionDto, @CurrentUser() user: Users) {
    const last = await this.practiceService.getLatest(user)
    if (last) {
      const [finished, validSolution] = await this.practiceService.checkFinished(user, last)
      if (!finished) {
        last.user = user
        throw new ConflictException({
          message: 'Finish current practice before creating new one',
          competition: last,
        })
      }
      // try to create daily comp
      if (validSolution && dto.format === CompetitionFormat.BO1) {
        const daily = await this.dailyService.generateCompetition(user)
        if (daily) {
          return daily
        }
      }
    }
    const competition = await this.practiceService.create(user, dto)
    return competition
  }

  async getOrThrow(alias: string) {
    const competition = await this.practiceService.getByAlias(alias)
    if (!competition) {
      throw new NotFoundException()
    }
    return competition
  }

  @Get(':alias')
  async practice(@Param('alias') alias: string) {
    const competition = await this.getOrThrow(alias)
    await this.practiceService.fetchInfo(competition, true)
    return competition
  }

  @Post(':alias')
  @ApiBearerAuth()
  @UseGuards(JwtOrBotRequiredGuard, BannedGuard)
  public async submit(@Param('alias') alias: string, @CurrentUser() user: Users, @Body() solution: SubmitSolutionDto) {
    const competition = await this.getOrThrow(alias)
    return await this.practiceService.submitSolution(competition, user, solution)
  }

  @Post(':alias/:id')
  @ApiBearerAuth()
  @UseGuards(JwtOrBotRequiredGuard)
  public async update(
    @Param('alias') alias: string,
    @Param('id', ParseIntPipe) submissionId: number,
    @CurrentUser() user: Users,
    @Body() solution: Pick<SubmitSolutionDto, 'comment' | 'attachments'>,
  ) {
    const competition = await this.getOrThrow(alias)
    await this.practiceService.update(competition, user, submissionId, solution)
    return true
  }

  @Put(':alias/description')
  @ApiBearerAuth()
  @UseGuards(JwtOrBotRequiredGuard)
  public async updateDescription(
    @Param('alias') alias: string,
    @CurrentUser() user: Users,
    @Body() dto: UpdatePracticeDescriptionDto,
  ) {
    const competition = await this.getOrThrow(alias)
    return await this.practiceService.updateDescription(competition, user, dto.description)
  }

  @Get(':userId/competitions')
  async practices(@Param('userId') userId: string) {
    const user = await this.userService.findOne(userId)
    if (!user) {
      throw new NotFoundException()
    }
    return await this.practiceService.getUserPractices(user)
  }

  @Get(':alias/results')
  async results(@Param('alias') alias: string) {
    const competition = await this.getOrThrow(alias)
    return await this.competitionService.getResults(competition)
  }

  @Get(':alias/submissions')
  @UseGuards(JwtAuthGuard)
  async submissions(@Param('alias') alias: string, @CurrentUser() user: Users) {
    const competition = await this.getOrThrow(alias)
    const { mappedSubmissions } = await this.competitionService.getSubmissions(competition, user, false)
    return mappedSubmissions
  }
}
