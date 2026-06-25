import { HttpModule } from '@nestjs/axios'
import { BullModule } from '@nestjs/bull'
import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { AttachmentModule } from '@/attachment/attachment.module'
import { AuthModule } from '@/auth/auth.module'
import { CompetitionModule } from '@/competition/competition.module'
import { Competitions } from '@/entities/competitions.entity'
import { Scrambles } from '@/entities/scrambles.entity'
import { Submissions } from '@/entities/submissions.entity'
import { Users } from '@/entities/users.entity'
import { WcaReconstructions } from '@/entities/wca-reconstructions.entity'
import { UserModule } from '@/user/user.module'

import { ReconstructionSyncProcessor } from './processors/reconstruction-sync.processor'
import { WcaReconstructionController } from './reconstruction.controller'
import { RECON_SYNC_QUEUE, WcaReconstructionService } from './reconstruction.service'

@Module({
  imports: [
    TypeOrmModule.forFeature([Competitions, Scrambles, Submissions, WcaReconstructions, Users]),
    BullModule.registerQueue({ name: RECON_SYNC_QUEUE }),
    HttpModule,
    AuthModule,
    AttachmentModule,
    UserModule,
    CompetitionModule,
  ],
  providers: [WcaReconstructionService, ReconstructionSyncProcessor],
  controllers: [WcaReconstructionController],
  exports: [WcaReconstructionService],
})
export class WcaReconstructionModule {}
