import { Transform } from 'class-transformer'
import { IsArray, IsEnum, IsInt, IsOptional, IsString, isString, Max, Min } from 'class-validator'

import { ValidAlgs } from '@/entities/algs.entity'
import { IFType } from '@/entities/insertion-finders.entity'

export class CreateIFDto {
  @IsOptional()
  name?: string = ''

  @IsInt()
  @IsEnum(IFType)
  type: IFType

  @IsOptional()
  @IsString()
  @Transform(({ value }) => (isString(value) ? value.trim() : value.toString()))
  scramble: string

  @IsString()
  skeleton: string

  @IsOptional()
  @IsArray()
  @IsEnum(ValidAlgs, { each: true })
  algs: string[]

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(6)
  @Transform(({ value }) => parseInt(value))
  greedy: number
}
