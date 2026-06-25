import { PartialType } from '@nestjs/swagger'

import { CreateTutorialDto } from './create-tutorial.dto'

export class UpdateTutorialDto extends PartialType(CreateTutorialDto) {}
