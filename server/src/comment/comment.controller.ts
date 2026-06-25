import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common'
import { ApiBearerAuth, ApiQuery } from '@nestjs/swagger'

import { CurrentUser } from '@/auth/decorators/current-user.decorator'
import { JwtAuthGuard } from '@/auth/guards/jwt.guard'
import { JwtRequiredGuard } from '@/auth/guards/jwt-required.guard'
import { CreateCommentDto } from '@/dtos/create-comment.dto'
import { Users } from '@/entities/users.entity'

import { CommentService } from './comment.service'

@Controller('comments')
export class CommentController {
  constructor(private readonly commentService: CommentService) {}

  @Get('submission/:id')
  @UseGuards(JwtAuthGuard)
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'offset', required: false })
  public async getComments(
    @Param('id', ParseIntPipe) submissionId: number,
    @Query('limit') limit = '3',
    @Query('offset') offset = '0',
  ) {
    return this.commentService.getComments(
      submissionId,
      Math.min(parseInt(limit, 10) || 3, 100),
      parseInt(offset, 10) || 0,
    )
  }

  @Get('submission/:id/count')
  public async getCommentCount(@Param('id', ParseIntPipe) submissionId: number) {
    return { count: await this.commentService.getCommentCount(submissionId) }
  }

  @Get('counts')
  @ApiQuery({ name: 'ids', required: true })
  public async getCommentCounts(@Query('ids') ids: string) {
    const submissionIds = ids
      .split(',')
      .map(id => parseInt(id, 10))
      .filter(id => !isNaN(id))
    return this.commentService.getCommentCounts(submissionIds)
  }

  @Post()
  @UseGuards(JwtRequiredGuard)
  @ApiBearerAuth()
  public async create(@CurrentUser() user: Users, @Body() dto: CreateCommentDto) {
    return this.commentService.create(user, dto)
  }

  @Delete(':id')
  @UseGuards(JwtRequiredGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  public async delete(@CurrentUser() user: Users, @Param('id', ParseIntPipe) id: number) {
    await this.commentService.delete(user, id)
  }

  @Get('search-users')
  @UseGuards(JwtRequiredGuard)
  @ApiBearerAuth()
  @ApiQuery({ name: 'q', required: true })
  public async searchUsers(@Query('q') query: string) {
    if (!query || query.length < 1) return []
    return this.commentService.searchUsers(query)
  }
}
