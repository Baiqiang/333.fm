import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { Comments } from '@/entities/comments.entity'
import { Competitions } from '@/entities/competitions.entity'
import { Results } from '@/entities/results.entity'
import { Submissions } from '@/entities/submissions.entity'
import { UserActivities } from '@/entities/user-activities.entity'
import { Users } from '@/entities/users.entity'

import { StatsController } from './stats.controller'
import { StatsService } from './stats.service'

@Module({
  imports: [TypeOrmModule.forFeature([Submissions, Competitions, Results, UserActivities, Comments, Users])],
  controllers: [StatsController],
  providers: [StatsService],
})
export class StatsModule {}
