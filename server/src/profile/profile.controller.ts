import { Controller, Get, NotFoundException, Param, Query, UseGuards } from '@nestjs/common'
import { ApiQuery } from '@nestjs/swagger'

import { CurrentUser } from '@/auth/decorators/current-user.decorator'
import { JwtAuthGuard } from '@/auth/guards/jwt.guard'
import { PaginationDto } from '@/dtos/pagination.dto'
import { CompetitionType } from '@/entities/competitions.entity'
import { Users } from '@/entities/users.entity'
import { UserService } from '@/user/user.service'

import { ProfileService } from './profile.service'

@Controller('profile')
export class ProfileController {
  constructor(
    private readonly userService: UserService,
    private readonly profileService: ProfileService,
  ) {}

  @Get(':id')
  async userProfile(@Param('id') id: string) {
    const user = await this.userService.findOne(id)
    if (!user) {
      throw new NotFoundException()
    }
    return user
  }

  @Get(':id/records')
  async records(@Param('id') id: string) {
    const user = await this.userService.findOne(id)
    if (!user) {
      throw new NotFoundException()
    }
    return this.profileService.getUserRecords(user)
  }

  @Get(':id/weekly')
  async weekly(@Param('id') id: string) {
    const user = await this.userService.findOne(id)
    if (!user) {
      throw new NotFoundException()
    }
    return this.profileService.getUserResultsByType(user, CompetitionType.WEEKLY)
  }

  @Get(':id/daily')
  async daily(@Param('id') id: string) {
    const user = await this.userService.findOne(id)
    if (!user) {
      throw new NotFoundException()
    }
    return this.profileService.getUserResultsByType(user, CompetitionType.DAILY)
  }

  @Get(':id/league')
  async league(@Param('id') id: string) {
    const user = await this.userService.findOne(id)
    if (!user) {
      throw new NotFoundException()
    }
    return this.profileService.getUserResultsByType(user, CompetitionType.LEAGUE)
  }

  @Get(':id/league-stats')
  async leagueStats(@Param('id') id: string) {
    const user = await this.userService.findOne(id)
    if (!user) {
      throw new NotFoundException()
    }
    return this.profileService.getUserLeagueStats(user)
  }

  @Get(':id/practice')
  async practice(@Param('id') id: string) {
    const user = await this.userService.findOne(id)
    if (!user) {
      throw new NotFoundException()
    }
    return this.profileService.getUserPracticeResults(user)
  }

  @Get(':id/endless')
  @UseGuards(JwtAuthGuard)
  async endless(@Param('id') id: string, @Query('challenge') challenge: string, @CurrentUser() currentUser: Users) {
    const user = await this.userService.findOne(id)
    if (!user) {
      throw new NotFoundException()
    }
    return this.profileService.getUserEndlessSubmissions(user, currentUser, challenge)
  }

  @Get(':id/joined-endless')
  async joinedEndless(@Param('id') id: string) {
    const user = await this.userService.findOne(id)
    if (!user) {
      throw new NotFoundException()
    }
    return this.profileService.getUserJoinedEndlesses(user)
  }

  @Get(':id/submissions')
  @UseGuards(JwtAuthGuard)
  @ApiQuery({ type: PaginationDto })
  async submissions(
    @Param('id') id: string,
    @CurrentUser() currentUser: Users,
    @Query() paginationOption: PaginationDto,
    @Query('type') type: number,
  ) {
    const user = await this.userService.findOne(id)
    if (!user) {
      throw new NotFoundException()
    }
    return this.profileService.getUserSubmissions(user, type, paginationOption, currentUser)
  }
}
