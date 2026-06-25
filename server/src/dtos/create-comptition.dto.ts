import { IsOptional } from 'class-validator'

import { CompetitionFormat } from '@/entities/competitions.entity'

export class CreateCompetitionDto {
  format: CompetitionFormat

  @IsOptional()
  startTime?: Date | string

  @IsOptional()
  endTime?: Date | string
}
