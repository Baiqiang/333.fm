import { IsString, MaxLength } from 'class-validator'

export class UpdatePracticeDescriptionDto {
  @IsString()
  @MaxLength(10000)
  description: string
}
