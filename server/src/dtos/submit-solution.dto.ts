import { IsEnum, IsInt, IsOptional } from 'class-validator'

import { CompetitionMode } from '@/entities/competitions.entity'
import { Insertion } from '@/entities/submissions.entity'

export class SubmitSolutionDto {
  @IsInt()
  scrambleId: number

  @IsEnum(CompetitionMode)
  mode: CompetitionMode

  solution: string

  comment: string

  @IsOptional()
  attachments?: number[]

  @IsOptional()
  parentId?: number

  @IsOptional()
  inverse?: boolean

  @IsOptional()
  insertions?: Insertion[]
}
