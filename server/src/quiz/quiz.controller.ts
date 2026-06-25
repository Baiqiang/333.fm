import { Body, Controller, DefaultValuePipe, Get, Param, ParseIntPipe, Post, Query, UseGuards } from '@nestjs/common'

import { CurrentUser } from '@/auth/decorators/current-user.decorator'
import { JwtAuthGuard } from '@/auth/guards/jwt.guard'
import { JwtRequiredGuard } from '@/auth/guards/jwt-required.guard'
import { DailyQuizStartDto, DailyQuizSubmitDto } from '@/dtos/daily-quiz.dto'
import { Users } from '@/entities/users.entity'

import { QuizService } from './quiz.service'

@Controller('quiz')
export class QuizController {
  constructor(private readonly quizService: QuizService) {}

  @Get('today')
  @UseGuards(JwtAuthGuard)
  async today(@CurrentUser() user: Users | null) {
    const quiz = await this.quizService.getTodayQuiz()
    return this.quizService.getQuizForUser(quiz.id, user)
  }

  @Get('day/:day')
  @UseGuards(JwtAuthGuard)
  async byDay(@Param('day') day: string, @CurrentUser() user: Users | null) {
    const quiz = await this.quizService.getQuizByDay(day)
    if (!quiz) return { quiz: null }
    return this.quizService.getQuizForUser(quiz.id, user)
  }

  @Post('start')
  @UseGuards(JwtRequiredGuard)
  async start(@CurrentUser() user: Users, @Body() dto: DailyQuizStartDto) {
    return this.quizService.startQuiz(user, dto.quizId)
  }

  @Post('submit')
  @UseGuards(JwtRequiredGuard)
  async submit(@CurrentUser() user: Users, @Body() dto: DailyQuizSubmitDto) {
    return this.quizService.submitQuiz(user, dto.quizId, dto.answers)
  }

  @Get('leaderboard/:id')
  async leaderboard(@Param('id', ParseIntPipe) id: number) {
    return this.quizService.getLeaderboard(id)
  }

  @Get('day/:day/submission/:id')
  @UseGuards(JwtAuthGuard)
  async viewSubmission(@Param('day') day: string, @Param('id') id: string, @CurrentUser() viewer: Users | null) {
    return this.quizService.getSubmissionByDay(day, id, viewer)
  }

  @Get('history')
  async history(@Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number) {
    return this.quizService.getHistory(page)
  }
}
