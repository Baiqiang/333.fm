import { Transform } from 'class-transformer'
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator'

import { CompetitionType } from '@/entities/competitions.entity'

import { PaginationDto } from '../dtos/pagination.dto'

export class SearchDto {
  @IsString()
  @IsOptional()
  q?: string

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  @Transform(({ value }) => parseInt(value))
  limit?: number = 5
}

export class SearchSubmissionsDto extends PaginationDto {
  @IsString()
  @IsOptional()
  q?: string

  @IsOptional()
  @IsInt()
  @Min(0)
  @Transform(({ value }) => parseInt(value))
  minMoves?: number

  @IsOptional()
  @IsInt()
  @Min(0)
  @Transform(({ value }) => parseInt(value))
  maxMoves?: number

  @IsOptional()
  @IsString()
  startDate?: string

  @IsOptional()
  @IsString()
  endDate?: string

  @IsOptional()
  @IsString()
  sortBy?: 'moves' | 'createdAt'

  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC'
}

export class SearchScramblesDto extends PaginationDto {
  @IsString()
  @IsOptional()
  q?: string

  @IsOptional()
  @IsString()
  startDate?: string

  @IsOptional()
  @IsString()
  endDate?: string
}

export class SearchCompetitionsDto extends PaginationDto {
  @IsString()
  @IsOptional()
  q?: string

  @IsOptional()
  @IsEnum(CompetitionType)
  @Transform(({ value }) => parseInt(value))
  type?: CompetitionType

  @IsOptional()
  @IsString()
  startDate?: string

  @IsOptional()
  @IsString()
  endDate?: string
}
