import { InjectQueue, Process, Processor } from '@nestjs/bull'
import { Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Job, Queue } from 'bull'
import { Repository } from 'typeorm'

import { IFStatus, IFType } from '@/entities/insertion-finders.entity'
import { RealInsertionFinders } from '@/entities/real-insertion-finders.entity'

import { JobData } from '../if.service'
import { BaseProcessor } from './base.processor'

@Processor('sf')
export class SfProcessor extends BaseProcessor {
  constructor(
    @InjectRepository(RealInsertionFinders)
    public readonly realInsertionFindersRepository: Repository<RealInsertionFinders>,
    @InjectQueue('sf')
    private readonly queue: Queue<JobData>,
  ) {
    super(realInsertionFindersRepository, new Logger(SfProcessor.name))
  }

  async init() {
    try {
      const pendings = await this.realInsertionFindersRepository.find({
        where: {
          type: IFType.SLICEY_FINDER,
          status: IFStatus.PENDING,
        },
      })
      for (const realIF of pendings) {
        await this.queue.add({
          hash: realIF.hash,
        })
      }
    } catch (e) {
      this.logger.error(e)
    }
  }

  @Process()
  async handleIF(job: Job<JobData>) {
    await this.computeIF(job)
  }
}
