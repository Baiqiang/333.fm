import { IsIn, IsOptional } from 'class-validator'

import { SCRAMBLE_CUBE_MODES, ScrambleCubeMode } from '@/entities/users.entity'

export class UpdatePreferencesDto {
  @IsOptional()
  @IsIn(SCRAMBLE_CUBE_MODES)
  scrambleCubeMode?: ScrambleCubeMode
}
