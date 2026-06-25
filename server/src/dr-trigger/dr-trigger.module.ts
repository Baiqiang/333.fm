import { CacheModule } from '@nestjs/cache-manager'
import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { AuthModule } from '@/auth/auth.module'
import { DRTriggerGameRounds } from '@/entities/dr-trigger-game-rounds.entity'
import { DRTriggerGames } from '@/entities/dr-trigger-games.entity'
import { DRTriggers } from '@/entities/dr-triggers.entity'

import { DRTriggerController } from './dr-trigger.controller'
import { DRTriggerService } from './dr-trigger.service'

@Module({
  imports: [
    CacheModule.register(),
    TypeOrmModule.forFeature([DRTriggers, DRTriggerGames, DRTriggerGameRounds]),
    AuthModule,
  ],
  controllers: [DRTriggerController],
  providers: [DRTriggerService],
})
export class DRTriggerModule {}
