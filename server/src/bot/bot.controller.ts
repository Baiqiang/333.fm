import { Body, Controller, Post, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiBody } from '@nestjs/swagger'

import { Roles } from '@/auth/decorators/roles.decorator'
import { Role } from '@/auth/enums/role.enum'
import { JwtOrBotRequiredGuard } from '@/auth/guards/jwt-or-bot-required.guard'
import { RolesGuard } from '@/auth/guards/roles.guard'
import { BindBotDto } from '@/dtos/bind-bot.dto'

import { BotService } from './bot.service'

@Controller('bot')
@UseGuards(JwtOrBotRequiredGuard, RolesGuard)
@Roles(Role.Bot)
export class BotController {
  constructor(private readonly botService: BotService) {}

  @Post('bind')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        token: {
          type: 'string',
        },
      },
      required: ['token'],
    },
  })
  @ApiBearerAuth()
  public async bind(@Body() { token }: BindBotDto) {
    return this.botService.bind(token)
  }
}
