import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiQuery } from '@nestjs/swagger'

import { CurrentUser } from '@/auth/decorators/current-user.decorator'
import { JwtRequiredGuard } from '@/auth/guards/jwt-required.guard'
import { Users } from '@/entities/users.entity'

import { NotificationService } from './notification.service'

@Controller('notifications')
@UseGuards(JwtRequiredGuard)
@ApiBearerAuth()
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'offset', required: false })
  public async getNotifications(
    @CurrentUser() user: Users,
    @Query('limit') limit = '20',
    @Query('offset') offset = '0',
  ) {
    return this.notificationService.getNotifications(
      user,
      Math.min(parseInt(limit, 10) || 20, 100),
      parseInt(offset, 10) || 0,
    )
  }

  @Get('unread-count')
  public async getUnreadCount(@CurrentUser() user: Users) {
    return { count: await this.notificationService.getUnreadCount(user) }
  }

  @Post('read')
  @HttpCode(HttpStatus.NO_CONTENT)
  public async markAsRead(@CurrentUser() user: Users, @Body('ids') ids: number[]) {
    if (ids?.length) await this.notificationService.markAsRead(user, ids)
  }

  @Post('read-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  public async markAllAsRead(@CurrentUser() user: Users) {
    await this.notificationService.markAllAsRead(user)
  }
}
