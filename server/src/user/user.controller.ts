import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common'
import { ApiBearerAuth, ApiQuery } from '@nestjs/swagger'
import { Pagination } from 'nestjs-typeorm-paginate'

import { CurrentUser } from '@/auth/decorators/current-user.decorator'
import { JwtRequiredGuard } from '@/auth/guards/jwt-required.guard'
import { PaginationDto } from '@/dtos/pagination.dto'
import { CompetitionType } from '@/entities/competitions.entity'
import { UserInsertionFinders } from '@/entities/user-insertion-finders.entity'
import { Users } from '@/entities/users.entity'

import { UserService } from './user.service'

@Controller('user')
@UseGuards(JwtRequiredGuard)
@ApiBearerAuth()
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('ifs')
  @ApiQuery({ type: PaginationDto })
  public async getIFs(
    @CurrentUser() user: Users,
    @Query() paginationOption: PaginationDto,
  ): Promise<Pagination<UserInsertionFinders['summary']>> {
    const ret = await this.userService.getUserIFs(user, paginationOption)
    return new Pagination(
      ret.items.map(item => item.summary),
      ret.meta,
      ret.links,
    )
  }

  @Post('if/:hash')
  public async updateIF(@CurrentUser() user: Users, @Param('hash') hash: string, @Body('name') name: string) {
    const userIF = await this.userService.getUserIFByHash(user, hash)
    if (!userIF) {
      throw new NotFoundException()
    }
    userIF.name = name
    await this.userService.saveUserIF(userIF)
    return userIF.summary
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete('if/:hash')
  public async deleteIF(@CurrentUser() user: Users, @Param('hash') hash: string) {
    const userIF = await this.userService.getUserIFByHash(user, hash)
    if (!userIF) {
      throw new NotFoundException()
    }
    await this.userService.deleteUserIF(userIF)
  }

  @Post('act')
  public async act(@CurrentUser() user: Users, @Body('id') id: number, @Body() body: Record<string, boolean>) {
    if (!id) throw new BadRequestException()
    if (!('like' in body) && !('favorite' in body) && !('decline' in body)) {
      throw new BadRequestException()
    }
    if ('view' in body || 'notify' in body) {
      throw new BadRequestException()
    }
    const submission = await this.userService.getSubmission(id)
    if (!submission) {
      throw new BadRequestException()
    }
    let canAct = true
    const competition = submission.competition
    if (!competition.hasEnded && [CompetitionType.WEEKLY, CompetitionType.ENDLESS].includes(competition.type)) {
      const userSubmission = await this.userService.getUserSubmission(submission.scrambleId, user)
      if (!userSubmission) {
        canAct = false
      }
    }
    if (!canAct) {
      throw new BadRequestException()
    }
    return await this.userService.act(user, id, body)
  }

  @Get('likes')
  public async likes(@CurrentUser() user: Users, @Query() paginationOption: PaginationDto) {
    return this.userService.getActivities(user, { like: true }, paginationOption)
  }

  @Get('favorites')
  public async favorites(@CurrentUser() user: Users, @Query() paginationOption: PaginationDto) {
    return this.userService.getActivities(user, { favorite: true }, paginationOption)
  }

  @Get('bot-token')
  public async getBotToken(@CurrentUser() user: Users) {
    return this.userService.getBotToken(user)
  }
}
