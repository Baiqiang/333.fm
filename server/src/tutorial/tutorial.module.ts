import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { Tutorials } from '@/entities/tutorials.entity'

import { TutorialController } from './tutorial.controller'
import { TutorialService } from './tutorial.service'

@Module({
  imports: [TypeOrmModule.forFeature([Tutorials])],
  providers: [TutorialService],
  controllers: [TutorialController],
})
export class TutorialModule {}
