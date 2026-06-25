import { BullModule } from '@nestjs/bull'
import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { AttachmentModule } from '@/attachment/attachment.module'
import { AuthModule } from '@/auth/auth.module'
import { Challenges } from '@/entities/challenges.entity'
import { Competitions } from '@/entities/competitions.entity'
import { EndlessChallengeConditions } from '@/entities/endless-challenge-conditions.entity'
import { EndlessKickoffs } from '@/entities/endless-kickoffs.entity'
import { LeagueDuels } from '@/entities/league-duels.entity'
import { LeagueEloHistories } from '@/entities/league-elo-histories.entity'
import { LeagueElos } from '@/entities/league-elos.entity'
import { LeagueParticipants } from '@/entities/league-participants.entity'
import { LeaguePlayers } from '@/entities/league-players.entity'
import { LeagueResults } from '@/entities/league-results.entity'
import { LeagueSeasons } from '@/entities/league-seasons.entity'
import { LeagueStandings } from '@/entities/league-standings.entity'
import { LeagueTiers } from '@/entities/league-tiers.entity'
import { Results } from '@/entities/results.entity'
import { Scrambles } from '@/entities/scrambles.entity'
import { Submissions } from '@/entities/submissions.entity'
import { UserActivities } from '@/entities/user-activities.entity'
import { Users } from '@/entities/users.entity'
import { UserModule } from '@/user/user.module'

import { ChainController } from './chain/chain.controller'
import { ChainService } from './chain/chain.service'
import { ChainProcessor } from './chain/processors/chain.processor'
import { CompetitionController } from './competition.controller'
import { CompetitionService } from './competition.service'
import { DailyController } from './daily/daily.controller'
import { DailyService } from './daily/daily.service'
import { EndlessController } from './endless/endless.controller'
import { EndlessService } from './endless/endless.service'
import { EndlessProcessor } from './endless/processors/endless.processor'
import { AdminController } from './league/admin/admin.controller'
import { LeagueController } from './league/league.controller'
import { LeagueService } from './league/league.service'
import { PracticeController } from './practice/practice.controller'
import { PracticeService } from './practice/practice.service'
import { PracticeProcessor } from './practice/processors/practice.processor'
import { WeeklyController } from './weekly/weekly.controller'
import { WeeklyService } from './weekly/weekly.service'
@Module({
  imports: [
    AttachmentModule,
    TypeOrmModule.forFeature([
      Competitions,
      Challenges,
      EndlessChallengeConditions,
      EndlessKickoffs,
      Results,
      Scrambles,
      Submissions,
      Users,
      UserActivities,
      LeagueSeasons,
      LeagueTiers,
      LeaguePlayers,
      LeagueDuels,
      LeagueStandings,
      LeagueResults,
      LeagueParticipants,
      LeagueElos,
      LeagueEloHistories,
    ]),
    BullModule.registerQueue(
      {
        name: 'endless',
      },
      {
        name: 'chain',
      },
      {
        name: 'practice',
      },
    ),
    UserModule,
    AuthModule,
  ],
  exports: [CompetitionService],
  providers: [
    CompetitionService,
    WeeklyService,
    DailyService,
    EndlessService,
    EndlessProcessor,
    ChainService,
    ChainProcessor,
    PracticeService,
    PracticeProcessor,
    LeagueService,
  ],
  controllers: [
    CompetitionController,
    WeeklyController,
    DailyController,
    EndlessController,
    ChainController,
    PracticeController,
    LeagueController,
    AdminController,
  ],
})
export class CompetitionModule {}
