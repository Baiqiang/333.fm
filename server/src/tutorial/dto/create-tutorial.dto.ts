import { IsEnum, IsInt, IsOptional, IsString, IsUrl, MaxLength } from 'class-validator'

import { TutorialLanguage } from '@/entities/tutorials.entity'

export class CreateTutorialDto {
  @IsString()
  @MaxLength(255)
  title: string

  @IsUrl()
  @MaxLength(1024)
  url: string

  @IsString()
  @MaxLength(100)
  category: string

  @IsEnum(TutorialLanguage)
  language: TutorialLanguage

  @IsOptional()
  @IsInt()
  sort?: number
}
