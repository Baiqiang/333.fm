import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager'
import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common'

import { CurrentUser } from '@/auth/decorators/current-user.decorator'
import { BannedGuard } from '@/auth/guards/banned.guard'
import { JwtRequiredGuard } from '@/auth/guards/jwt-required.guard'
import { DRTriggerStartDto, DRTriggerSubmitDto } from '@/dtos/dr-trigger-submit.dto'
import { Users } from '@/entities/users.entity'

import { DRTriggerService } from './dr-trigger.service'

@Controller('dr-trigger')
export class DRTriggerController {
  constructor(private readonly drTriggerService: DRTriggerService) {}

  @Post('start')
  @UseGuards(JwtRequiredGuard, BannedGuard)
  async start(@CurrentUser() user: Users, @Body() dto: DRTriggerStartDto) {
    return this.drTriggerService.startGame(
      user,
      dto.difficulty ?? 5,
      dto.rzp,
      dto.merged ?? true,
      dto.practice ?? false,
    )
  }

  @Post('submit')
  @UseGuards(JwtRequiredGuard, BannedGuard)
  async submit(@CurrentUser() user: Users, @Body() dto: DRTriggerSubmitDto) {
    return this.drTriggerService.submitSolution(user, dto.gameId, dto.solution)
  }

  @Post('abandon/:id')
  @UseGuards(JwtRequiredGuard)
  async abandon(@CurrentUser() user: Users, @Param('id', ParseIntPipe) id: number) {
    return this.drTriggerService.abandonGame(user, id)
  }

  @Get('ongoing')
  @UseGuards(JwtRequiredGuard)
  async ongoing(@CurrentUser() user: Users) {
    return this.drTriggerService.getOngoingGame(user)
  }

  @Get('game/:id')
  async getGame(@Param('id', ParseIntPipe) id: number) {
    return this.drTriggerService.getGame(id)
  }

  @Get('my-games')
  @UseGuards(JwtRequiredGuard)
  async myGames(@CurrentUser() user: Users, @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number) {
    return this.drTriggerService.getMyGames(user, page)
  }

  @Get('leaderboard')
  async leaderboard(
    @Query('difficulty') difficulty?: string,
    @Query('rzp') rzp?: string,
    @Query('merged') merged?: string,
  ) {
    const diff = difficulty !== undefined ? Number.parseInt(difficulty) : undefined
    const m = merged !== undefined ? merged === 'true' : undefined
    return this.drTriggerService.getLeaderboard(diff, rzp, m)
  }

  @Get('rzps')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(3600000)
  async rzps() {
    return this.drTriggerService.getDistinctRzps()
  }

  @Get('cases')
  async cases(
    @Query('moves') moves?: string,
    @Query('rzpc') rzpc?: string,
    @Query('rzpe') rzpe?: string,
    @Query('armc') armc?: string,
    @Query('arme') arme?: string,
    @Query('eo') eo?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('merged') merged?: string,
  ) {
    const m = moves !== undefined ? Number.parseInt(moves) : undefined
    const isMerged = merged !== 'false'
    return this.drTriggerService.getCases(m, { rzpc, rzpe, armc, arme, eo }, page, 50, isMerged)
  }

  @Get('case/:id')
  async getCase(@Param('id', ParseIntPipe) id: number) {
    return this.drTriggerService.getCase(id)
  }

  @Get('symmetry-group/:group')
  async symmetryGroup(@Param('group') group: string) {
    return this.drTriggerService.getSymmetryGroupCases(group)
  }

  @Get('distinct-moves')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(3600000)
  async distinctMoves() {
    return this.drTriggerService.getDistinctMoves()
  }

  @Get('distinct-arms')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(3600000)
  async distinctArms() {
    return this.drTriggerService.getDistinctArms()
  }
}
