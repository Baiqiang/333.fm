import { IsBoolean, IsInt, IsOptional, IsString } from 'class-validator'

export class DRTriggerStartDto {
  @IsOptional()
  @IsInt()
  difficulty?: number

  @IsOptional()
  @IsString()
  rzp?: string

  @IsOptional()
  @IsBoolean()
  merged?: boolean

  @IsOptional()
  @IsBoolean()
  practice?: boolean
}

export class DRTriggerSubmitDto {
  @IsInt()
  gameId: number

  @IsString()
  solution: string
}
