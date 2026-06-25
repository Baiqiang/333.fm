import { Body, Controller, Get, NotFoundException, Param, Post, UseGuards } from '@nestjs/common'

import { CurrentUser } from '@/auth/decorators/current-user.decorator'
import { JwtAuthGuard } from '@/auth/guards/jwt.guard'
import { CreateIFDto } from '@/dtos/create-if.dto'
import { IFType, InsertionFinders } from '@/entities/insertion-finders.entity'
import { Users } from '@/entities/users.entity'
import { UserService } from '@/user/user.service'

import { IfService } from './if.service'

@Controller('if')
export class IfController {
  constructor(
    private readonly ifService: IfService,
    private readonly userService: UserService,
  ) {}

  @Get(':hash')
  public async getIFByHash(@Param('hash') hash: string): Promise<InsertionFinders['detail']> {
    const insertionFinder = await this.ifService.getIFByHash(hash)
    if (!insertionFinder) {
      throw new NotFoundException()
    }
    return insertionFinder.detail
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  public async createIF(
    @CurrentUser() user: Users,
    @Body() createIFDto: CreateIFDto,
  ): Promise<InsertionFinders['detail']> {
    if (!user && createIFDto.type === IFType.INSERTION_FINDER) {
      createIFDto.greedy = 2
    }
    const insertionFinder = await this.ifService.createIF(createIFDto)
    if (user) {
      await this.userService.createUserIF(user, insertionFinder, createIFDto.name)
    }
    return insertionFinder.detail
  }
}
