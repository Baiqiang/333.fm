import { IsNotEmpty } from 'class-validator'

export class BindBotDto {
  @IsNotEmpty()
  token: string
}
