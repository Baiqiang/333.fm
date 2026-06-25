import { IsArray, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator'

export class SubmitWcaReconstructionDto {
  @IsString()
  wcaCompetitionId: string

  @IsInt()
  @Min(1)
  roundNumber: number

  @IsInt()
  @Min(1)
  scrambleNumber: number

  @IsString()
  @IsOptional()
  scramble?: string

  @IsString()
  @MaxLength(500)
  @IsOptional()
  solution?: string

  @IsString()
  @MaxLength(2048)
  @IsOptional()
  comment?: string

  @IsArray()
  @IsInt({ each: true })
  @IsOptional()
  attachments?: number[]
}

export class UpdateWcaReconstructionDescriptionDto {
  @IsString()
  @MaxLength(10000)
  description: string
}
