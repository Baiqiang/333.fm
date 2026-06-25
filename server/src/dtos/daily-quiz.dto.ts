import { IsArray, IsInt } from 'class-validator'

export class DailyQuizStartDto {
  @IsInt()
  quizId: number
}

export class DailyQuizSubmitDto {
  @IsInt()
  quizId: number

  @IsArray()
  answers: number[][]
}
