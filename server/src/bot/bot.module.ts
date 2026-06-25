import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { BotTokens } from '@/entities/bot-tokens.entity'
import { Users } from '@/entities/users.entity'

import { BotController } from './bot.controller'
import { BotService } from './bot.service'

@Module({
  imports: [TypeOrmModule.forFeature([BotTokens, Users])],
  exports: [BotService],
  providers: [BotService],
  controllers: [BotController],
})
export class BotModule {}
