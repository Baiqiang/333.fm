import { Controller, Get, NotFoundException, Param, ParseIntPipe, Query, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiQuery } from '@nestjs/swagger'
import { Pagination } from 'nestjs-typeorm-paginate'

import { Roles } from '@/auth/decorators/roles.decorator'
import { Role } from '@/auth/enums/role.enum'
import { JwtRequiredGuard } from '@/auth/guards/jwt-required.guard'
import { RolesGuard } from '@/auth/guards/roles.guard'
import { PaginationDto } from '@/dtos/pagination.dto'
import { InsertionFinders } from '@/entities/insertion-finders.entity'
import { Users } from '@/entities/users.entity'
import { UserService } from '@/user/user.service'

import { AdminService } from './admin.service'

@Controller('admin')
@UseGuards(JwtRequiredGuard, RolesGuard)
@Roles(Role.Admin)
@ApiBearerAuth()
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly userService: UserService,
  ) {}

  @Get('ifs')
  @ApiQuery({ type: PaginationDto })
  public async getIFs(
    @Query() { limit, page }: PaginationDto,
  ): Promise<Pagination<InsertionFinders['summary'] & { users: Users[] }>> {
    const ret = await this.adminService.getIFs({ limit, page })
    return new Pagination(
      ret.items.map(item => ({
        ...item.summary,
        users: item.userInsertionFinders.map(userIF => userIF.user),
      })),
      ret.meta,
      ret.links,
    )
  }

  @Get('users')
  @ApiQuery({ type: PaginationDto })
  public async getUsers(@Query() { limit, page }: PaginationDto): Promise<Pagination<Users>> {
    const ret = await this.userService.getUsers({ limit, page })
    return new Pagination(
      await Promise.all(
        ret.items.map(async user => {
          const finders = await this.userService.countUserIFs(user)
          return {
            ...user,
            finders,
          }
        }),
      ),
      ret.meta,
      ret.links,
    )
  }

  @Get('user/:id')
  public async getUser(@Param('id', ParseIntPipe) id: number): Promise<Users> {
    const user = await this.userService.findOne(id)
    if (!user) {
      throw new NotFoundException()
    }
    return user
  }

  @Get('user/:id/ifs')
  @ApiQuery({ type: PaginationDto })
  public async getUserIFs(
    @Param('id', ParseIntPipe) id: number,
    @Query() { limit, page }: PaginationDto,
  ): Promise<Pagination<InsertionFinders['summary']>> {
    const user = await this.userService.findOne(id)
    if (!user) {
      throw new NotFoundException()
    }
    const userIFs = await this.userService.getUserIFs(user, { limit, page })
    return new Pagination(
      userIFs.items.map(item => item.summary),
      userIFs.meta,
    )
  }
}
