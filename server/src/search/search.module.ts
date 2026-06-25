import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { Competitions } from '@/entities/competitions.entity'
import { Scrambles } from '@/entities/scrambles.entity'
import { Submissions } from '@/entities/submissions.entity'
import { Users } from '@/entities/users.entity'

import { SearchController } from './search.controller'
import { SearchService } from './search.service'

@Module({
  imports: [TypeOrmModule.forFeature([Users, Submissions, Scrambles, Competitions])],
  controllers: [SearchController],
  providers: [SearchService],
})
export class SearchModule {}
