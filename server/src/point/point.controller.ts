import { Controller, DefaultValuePipe, Get, Param, ParseIntPipe, Query } from '@nestjs/common'

import { PointQueryService } from './point.service'

@Controller('point')
export class PointController {
  constructor(private readonly pointQueryService: PointQueryService) {}

  @Get('rankings')
  async getRankings(
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
  ) {
    return this.pointQueryService.getRankings(Math.min(limit, 100), offset)
  }

  @Get('user/:userId')
  async getUserHistory(@Param('userId', ParseIntPipe) userId: number) {
    return this.pointQueryService.getUserHistory(userId)
  }

  @Get('user/:userId/summary')
  async getUserSummary(@Param('userId', ParseIntPipe) userId: number) {
    return this.pointQueryService.getUserSummary(userId)
  }
}
