import { Body, Controller, Get, NotFoundException, Param, Post, Put, Query, UseGuards } from '@nestjs/common'
import { ApiQuery } from '@nestjs/swagger'

import { CurrentUser } from '@/auth/decorators/current-user.decorator'
import { JwtAuthGuard } from '@/auth/guards/jwt.guard'
import { JwtRequiredGuard } from '@/auth/guards/jwt-required.guard'
import { PaginationDto } from '@/dtos/pagination.dto'
import { SubmitWcaReconstructionDto, UpdateWcaReconstructionDescriptionDto } from '@/dtos/wca-reconstruction.dto'
import { Users } from '@/entities/users.entity'
import { UserService } from '@/user/user.service'

import { WcaReconstructionService } from './reconstruction.service'

@Controller('wca/reconstruction')
export class WcaReconstructionController {
  constructor(
    private readonly reconstructionService: WcaReconstructionService,
    private readonly userService: UserService,
  ) {}

  @Get()
  @ApiQuery({ type: PaginationDto })
  async getLatest(@Query() query: PaginationDto, @Query('sort') sort?: string) {
    return this.reconstructionService.getLatestRecons({ page: query.page, limit: query.limit }, sort)
  }

  @Get('user/:id')
  async getUserRecons(@Param('id') id: string) {
    const user = await this.userService.findOne(id)
    if (!user) {
      throw new NotFoundException()
    }
    return this.reconstructionService.getUserRecons(user)
  }

  @Get(':competitionId/user/:uId')
  @UseGuards(JwtAuthGuard)
  async getUserReconForCompetition(
    @Param('competitionId') competitionId: string,
    @Param('uId') uId: string,
    @CurrentUser() user: Users,
  ) {
    const targetUser = await this.userService.findOne(uId)
    if (!targetUser) {
      throw new NotFoundException()
    }
    const data = await this.reconstructionService.getUserReconForCompetition(competitionId, targetUser, user)
    if (!data) {
      throw new NotFoundException()
    }
    return data
  }

  @Get(':competitionId')
  @UseGuards(JwtAuthGuard)
  async getCompetitionData(@Param('competitionId') competitionId: string, @CurrentUser() user: Users) {
    return this.reconstructionService.getCompetitionData(competitionId, user)
  }

  @Post('submit')
  @UseGuards(JwtRequiredGuard)
  async submit(@CurrentUser() user: Users, @Body() dto: SubmitWcaReconstructionDto) {
    return this.reconstructionService.submit(user, dto)
  }

  @Put(':competitionId/description')
  @UseGuards(JwtRequiredGuard)
  async updateDescription(
    @CurrentUser() user: Users,
    @Param('competitionId') competitionId: string,
    @Body() dto: UpdateWcaReconstructionDescriptionDto,
  ) {
    return this.reconstructionService.updateDescription(user, competitionId, dto)
  }

  @Get(':competitionId/scrambles')
  async getScrambles(@Param('competitionId') competitionId: string) {
    return this.reconstructionService.getScrambles(competitionId)
  }

  @Post(':competitionId/sync-scrambles')
  async syncScrambles(@Param('competitionId') competitionId: string) {
    return this.reconstructionService.syncScramblesFromWca(competitionId)
  }

  @Post(':competitionId/sync-wca-data')
  async syncWcaData(@Param('competitionId') competitionId: string) {
    await this.reconstructionService.queueSyncWcaData(competitionId)
    return { queued: true }
  }
}
