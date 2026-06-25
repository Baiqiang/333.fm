import { Process, Processor } from '@nestjs/bull'
import { Logger } from '@nestjs/common'
import { Job } from 'bull'

import { RECON_SYNC_QUEUE, type ReconSyncJobData, WcaReconstructionService } from '../reconstruction.service'

@Processor(RECON_SYNC_QUEUE)
export class ReconstructionSyncProcessor {
  private readonly logger = new Logger(ReconstructionSyncProcessor.name)

  constructor(private readonly reconstructionService: WcaReconstructionService) {}

  @Process()
  async handleSync(job: Job<ReconSyncJobData>) {
    const { wcaCompetitionId } = job.data
    this.logger.log(`Syncing WCA data for competition ${wcaCompetitionId}`)
    try {
      const count = await this.reconstructionService.syncWcaDataForCompetition(wcaCompetitionId)
      this.logger.log(`Synced ${count} reconstructions for ${wcaCompetitionId}`)
      return count
    } catch (e) {
      this.logger.error(`Failed to sync WCA data for ${wcaCompetitionId}: ${e}`)
      throw e
    }
  }
}
