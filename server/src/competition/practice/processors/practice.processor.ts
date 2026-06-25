import { Process, Processor } from '@nestjs/bull'
import { InjectRepository } from '@nestjs/typeorm'
import { Job } from 'bull'
import { Repository } from 'typeorm'

import { Competitions } from '@/entities/competitions.entity'
import { Results } from '@/entities/results.entity'
import { Submissions } from '@/entities/submissions.entity'
import { setRanks } from '@/utils'

import { PracticeJob } from '../practice.service'

@Processor('practice')
export class PracticeProcessor {
  constructor(
    @InjectRepository(Competitions)
    private readonly competitionsRepository: Repository<Competitions>,
    @InjectRepository(Submissions)
    private readonly submissionsRepository: Repository<Submissions>,
    @InjectRepository(Results)
    private readonly resultsRepository: Repository<Results>,
  ) {}

  @Process()
  async process(job: Job<PracticeJob>) {
    const { competitionId } = job.data
    const results = await this.resultsRepository.findBy({ competitionId })
    setRanks(results)
    await this.resultsRepository.save(results)
  }
}
