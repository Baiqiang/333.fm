import { BullModule } from '@nestjs/bull'
import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { Algs } from '@/entities/algs.entity'
import { InsertionFinders } from '@/entities/insertion-finders.entity'
import { RealInsertionFinders } from '@/entities/real-insertion-finders.entity'
import { UserModule } from '@/user/user.module'

import { IfController } from './if.controller'
import { IfService } from './if.service'
import { IfHGProcessor } from './processors/if.hg.processor'
import { IfProcessor } from './processors/if.processor'
import { SfProcessor } from './processors/sf.processor'

@Module({
  imports: [
    TypeOrmModule.forFeature([Algs, InsertionFinders, RealInsertionFinders]),
    BullModule.registerQueue(
      {
        name: 'if',
      },
      {
        name: 'sf',
      },
      {
        name: 'if.hg',
      },
    ),
    UserModule,
  ],
  exports: [IfService],
  providers: [IfService, IfProcessor, SfProcessor, IfHGProcessor],
  controllers: [IfController],
})
export class IfModule {}
