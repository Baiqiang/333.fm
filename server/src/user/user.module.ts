import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { BotModule } from '@/bot/bot.module'
import { Algs } from '@/entities/algs.entity'
import { BotTokens } from '@/entities/bot-tokens.entity'
import { Competitions } from '@/entities/competitions.entity'
import { InsertionFinders } from '@/entities/insertion-finders.entity'
import { Notifications } from '@/entities/notifications.entity'
import { RealInsertionFinders } from '@/entities/real-insertion-finders.entity'
import { Submissions } from '@/entities/submissions.entity'
import { UserActivities } from '@/entities/user-activities.entity'
import { UserInsertionFinders } from '@/entities/user-insertion-finders.entity'
import { UserRoles } from '@/entities/user-roles.entity'
import { Users } from '@/entities/users.entity'

import { UserController } from './user.controller'
import { UserService } from './user.service'

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Algs,
      Competitions,
      InsertionFinders,
      Notifications,
      RealInsertionFinders,
      Submissions,
      Users,
      UserInsertionFinders,
      UserRoles,
      UserActivities,
      BotTokens,
    ]),
    BotModule,
  ],
  exports: [UserService],
  providers: [UserService],
  controllers: [UserController],
})
export class UserModule {}
