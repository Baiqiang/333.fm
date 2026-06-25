import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { UserPoints } from '@/entities/user-points.entity'

import { PointController } from './point.controller'
import { PointQueryService } from './point.service'

@Module({
  imports: [TypeOrmModule.forFeature([UserPoints])],
  controllers: [PointController],
  providers: [PointQueryService],
})
export class PointModule {}
