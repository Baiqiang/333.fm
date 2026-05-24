import { BullModule } from '@nestjs/bull'
import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { TypeOrmModule } from '@nestjs/typeorm'
import { SnakeNamingStrategy } from 'typeorm-naming-strategies'

import configuration from '@/config/configuration'
import { Algs } from '@/entities/algs.entity'
import { Attachments } from '@/entities/attachment.entity'
import { Challenges } from '@/entities/challenges.entity'
import { Comments } from '@/entities/comments.entity'
import { Competitions } from '@/entities/competitions.entity'
import { DRTriggerGameRounds } from '@/entities/dr-trigger-game-rounds.entity'
import { DRTriggerGames } from '@/entities/dr-trigger-games.entity'
import { DRTriggers } from '@/entities/dr-triggers.entity'
import { EndlessChallengeConditions } from '@/entities/endless-challenge-conditions.entity'
import { EndlessKickoffs } from '@/entities/endless-kickoffs.entity'
import { InsertionFinders } from '@/entities/insertion-finders.entity'
import { LeagueDuels } from '@/entities/league-duels.entity'
import { LeagueEloHistories } from '@/entities/league-elo-histories.entity'
import { LeagueElos } from '@/entities/league-elos.entity'
import { LeagueParticipants } from '@/entities/league-participants.entity'
import { LeaguePlayers } from '@/entities/league-players.entity'
import { LeagueResults } from '@/entities/league-results.entity'
import { LeagueSeasons } from '@/entities/league-seasons.entity'
import { LeagueStandings } from '@/entities/league-standings.entity'
import { LeagueTiers } from '@/entities/league-tiers.entity'
import { LeaveSliceCases } from '@/entities/leave-slice-cases.entity'
import { Notifications } from '@/entities/notifications.entity'
import { RealInsertionFinders } from '@/entities/real-insertion-finders.entity'
import { Results } from '@/entities/results.entity'
import { Scrambles } from '@/entities/scrambles.entity'
import { Submissions } from '@/entities/submissions.entity'
import { UserActivities } from '@/entities/user-activities.entity'
import { UserInsertionFinders } from '@/entities/user-insertion-finders.entity'
import { UserPoints } from '@/entities/user-points.entity'
import { UserRoles } from '@/entities/user-roles.entity'
import { Users } from '@/entities/users.entity'

import { CmdService } from './cmd.service'
import { DRTriggerCommand } from './dr-trigger/dr-trigger.command'
import { DRTriggerCommandService } from './dr-trigger/dr-trigger.service'
import { EndlessCommand } from './endless/endless.command'
import { EndlessCommandService } from './endless/endless.service'
import { LeagueCommand } from './league/league.command'
import { LeagueService } from './league/league.service'
import { LeaveSliceCommand } from './leave-slice/leave-slice.command'
import { LeaveSliceCommandService } from './leave-slice/leave-slice.service'
import { PointCommand } from './point/point.command'
import { PointService } from './point/point.service'
import { SubmissionCommand } from './submission/submission.command'
import { SubmissionService } from './submission/submission.service'
import { BanService } from './user/ban.service'
import { UserCommand } from './user/user.command'
import { UserService } from './user/user.service'
import { WcaCommand } from './wca/wca.command'
import { WcaService } from './wca/wca.service'

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [configuration],
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: 'localhost',
      port: 3306,
      username: '333.fm',
      password: '',
      database: '333fm',
      synchronize: true,
      autoLoadEntities: true,
      namingStrategy: new SnakeNamingStrategy(),
      // logging: true,
    }),
    TypeOrmModule.forFeature([
      Algs,
      Challenges,
      Competitions,
      EndlessChallengeConditions,
      EndlessKickoffs,
      InsertionFinders,
      RealInsertionFinders,
      Results,
      Scrambles,
      Submissions,
      Attachments,
      UserPoints,
      Users,
      UserActivities,
      UserInsertionFinders,
      UserRoles,
      LeagueSeasons,
      LeagueTiers,
      LeaguePlayers,
      LeagueDuels,
      LeagueStandings,
      LeagueResults,
      LeagueParticipants,
      LeagueElos,
      LeagueEloHistories,
      Comments,
      Notifications,
      DRTriggers,
      DRTriggerGames,
      DRTriggerGameRounds,
      LeaveSliceCases,
    ]),
    BullModule.forRoot({
      redis: {
        host: 'localhost',
        port: 6379,
      },
    }),
    BullModule.registerQueue({
      name: 'endless',
    }),
  ],
  providers: [
    CmdService,
    DRTriggerCommandService,
    DRTriggerCommand,
    EndlessCommandService,
    EndlessCommand,
    PointService,
    PointCommand,
    SubmissionService,
    SubmissionCommand,
    UserService,
    UserCommand,
    BanService,
    LeagueService,
    LeagueCommand,
    WcaService,
    WcaCommand,
    LeaveSliceCommandService,
    LeaveSliceCommand,
  ],
})
export class CmdModule {}
