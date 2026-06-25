import { IsInt, IsNotEmpty, IsString } from 'class-validator'

export class AdminAddSubmissionDto {
  @IsInt()
  scrambleId: number

  @IsInt()
  userId: number

  @IsString()
  @IsNotEmpty()
  solution: string

  @IsString()
  comment: string
}
