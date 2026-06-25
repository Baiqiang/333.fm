import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { AuthModule } from '@/auth/auth.module'
import { DailyQuizSubmissions } from '@/entities/daily-quiz-submissions.entity'
import { DailyQuizzes } from '@/entities/daily-quizzes.entity'
import { QuizQuestionBank } from '@/entities/quiz-question-bank.entity'

import { QuizController } from './quiz.controller'
import { QuizService } from './quiz.service'

@Module({
  imports: [TypeOrmModule.forFeature([DailyQuizzes, DailyQuizSubmissions, QuizQuestionBank]), AuthModule],
  controllers: [QuizController],
  providers: [QuizService],
})
export class QuizModule {}
