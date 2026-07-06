import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common'

import { CurrentUser } from '@/auth/decorators/current-user.decorator'
import { JwtRequiredGuard } from '@/auth/guards/jwt-required.guard'
import { CreateFunChallengeDto } from '@/dtos/create-fun-challenge.dto'
import { Users } from '@/entities/users.entity'

import { FunChallengeService } from './fun-challenge.service'
import { FunChallengeAdminGuard } from './fun-challenge-admin.guard'

@Controller('fun-challenges/admin')
@UseGuards(JwtRequiredGuard, FunChallengeAdminGuard)
export class FunChallengeAdminController {
  constructor(private readonly funChallengeService: FunChallengeService) {}

  @Get('competitions')
  async getCompetitions() {
    return this.funChallengeService.getAdminCompetitions()
  }

  @Post('create')
  async create(@Body() dto: CreateFunChallengeDto, @CurrentUser() user: Users) {
    return this.funChallengeService.create(dto, user)
  }

  @Post(':alias/start')
  async start(@Param('alias') alias: string) {
    return this.funChallengeService.start(alias)
  }

  @Post(':alias/end')
  async end(@Param('alias') alias: string) {
    return this.funChallengeService.end(alias)
  }

  @Delete(':alias')
  async delete(@Param('alias') alias: string) {
    return this.funChallengeService.delete(alias)
  }
}
