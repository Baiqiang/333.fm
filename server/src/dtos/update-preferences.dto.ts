import { IsBoolean, IsOptional } from 'class-validator'

export class UpdatePreferencesDto {
  @IsOptional()
  @IsBoolean()
  scrambleCube?: boolean
}
