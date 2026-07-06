import { IsArray, IsDateString, IsEnum, IsOptional } from 'class-validator'

import { CompetitionFormat, CompetitionSubType } from '@/entities/competitions.entity'

export class CreateFunChallengeDto {
  @IsEnum(CompetitionSubType)
  subType: CompetitionSubType

  @IsEnum(CompetitionFormat)
  format: CompetitionFormat

  @IsDateString()
  startTime: string

  @IsDateString()
  endTime: string

  @IsOptional()
  @IsArray()
  scrambles?: string[]
}
