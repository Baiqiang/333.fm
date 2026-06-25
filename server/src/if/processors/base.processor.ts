import { Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Job } from 'bull'
import { spawn } from 'child_process'
import { Repository } from 'typeorm'

import { IFStatus, IFType } from '@/entities/insertion-finders.entity'
import { RealInsertionFinders } from '@/entities/real-insertion-finders.entity'

import { JobData } from '../if.service'

export abstract class BaseProcessor {
  constructor(
    @InjectRepository(RealInsertionFinders)
    public readonly realInsertionFindersRepository: Repository<RealInsertionFinders>,
    public readonly logger: Logger,
  ) {
    this.init()
  }

  abstract init(): void

  async computeIF(job: Job<JobData>) {
    const hash = job.data.hash
    const realIF = await this.realInsertionFindersRepository.findOne({
      where: {
        hash,
        status: IFStatus.PENDING,
      },
      relations: ['algs'],
    })
    if (!realIF) {
      this.logger.error(`Cannot find insertion finder ${hash}`)
      return
    }
    this.logger.log(`Start computing insertion finder ${hash} with greedy ${realIF.greedy}`)
    if (realIF.status === IFStatus.PENDING) {
      realIF.status = IFStatus.COMPUTING
    }
    await this.realInsertionFindersRepository.save(realIF)
    const args = ['-j', '--json']
    let input: string
    switch (realIF.type) {
      case IFType.SLICEY_FINDER:
        args.push('-i')
        args.push('-a')
        args.push('slice')
        input = `${realIF.skeleton}\n`
        break
      case IFType.INSERTION_FINDER:
        args.push('-s')
        args.push('--greedy-threshold=' + realIF.greedy)
        realIF.algs.forEach(alg => {
          args.push('-a')
          args.push(alg.name)
        })
        input = `${realIF.scramble}\n${realIF.skeleton}\n`
    }
    try {
      const result = await new Promise<object>((resolve, reject) => {
        const output: Record<'stdout' | 'stderr', string[]> = {
          stdout: [],
          stderr: [],
        }
        const child = spawn('insertionfinder', args)
        this.logger.log(`Run command insertionfinder ${args.join(' ')}\n${input.trim()}`)
        for (const stream of ['stdout', 'stderr']) {
          child[stream].on('data', (data: string) => output[stream].push(data))
        }
        child.on('error', reject)
        child.on('close', () => {
          if (output.stdout.length) {
            resolve(JSON.parse(output.stdout.join('')))
          } else {
            reject(output.stderr.join(''))
          }
        })
        child.stdin.write(input)
      })
      realIF.result = result
      realIF.status = IFStatus.FINISHED
      await this.realInsertionFindersRepository.save(realIF)
      this.logger.log(`Insertion finder ${hash} finished`)
    } catch (e) {
      this.logger.error('Error while computing insertion finder', e)
      realIF.status = IFStatus.PENDING
      await this.realInsertionFindersRepository.save(realIF)
      throw e
    }
  }
}
