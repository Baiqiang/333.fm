import { InjectQueue } from '@nestjs/bull'
import { BadRequestException, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectRepository } from '@nestjs/typeorm'
import { Queue } from 'bull'
import { centerCycleTable, Cube } from 'insertionfinder'
import compare from 'node-version-compare'
import { Repository } from 'typeorm'

import { CreateIFDto } from '@/dtos/create-if.dto'
import { Algs } from '@/entities/algs.entity'
import { IFStatus, IFType, InsertionFinders } from '@/entities/insertion-finders.entity'
import { RealInsertionFinders } from '@/entities/real-insertion-finders.entity'
import { calculateHash, centerLength, formatAlgorithm, formatSkeleton } from '@/utils'

export interface JobData {
  hash: string
}
@Injectable()
export class IfService {
  constructor(
    @InjectRepository(Algs)
    private readonly algsRepository: Repository<Algs>,
    @InjectRepository(InsertionFinders)
    private readonly insertionFindersRepository: Repository<InsertionFinders>,
    @InjectRepository(RealInsertionFinders)
    private readonly realInsertionFindersRepository: Repository<RealInsertionFinders>,
    private readonly configService: ConfigService,
    @InjectQueue('if')
    private readonly ifQueue: Queue<JobData>,
    @InjectQueue('sf')
    private readonly sfQueue: Queue<JobData>,
    @InjectQueue('if.hg')
    private readonly ifHGQueue: Queue<JobData>,
  ) {}

  public async getIFByHash(hash: string) {
    const insertionFinder = await this.insertionFindersRepository.findOne({
      where: {
        hash,
      },
      relations: ['realInsertionFinder', 'realInsertionFinder.algs'],
    })
    if (!insertionFinder) {
      return null
    }
    // check version
    const realIF = insertionFinder.realInsertionFinder
    if (compare(realIF.version, this.configService.get('if.version')[realIF.type]) < 0) {
      realIF.version = this.configService.get('if.version')[realIF.type]
      realIF.status = IFStatus.PENDING
      const { formattedSkeleton } = formatSkeleton(realIF.scramble, insertionFinder.skeleton)
      if (formattedSkeleton !== realIF.skeleton) {
        realIF.skeleton = formattedSkeleton
        realIF.hash = calculateHash({
          scramble: realIF.scramble,
          skeleton: realIF.skeleton,
          algs: realIF.algs.map(a => a.name).sort(),
          ...(realIF.greedy === 2 ? {} : { greedy: realIF.greedy }),
        })
      }
      await this.realInsertionFindersRepository.save(realIF)
      this.addIFJob(realIF)
    }
    return insertionFinder
  }

  public async createIF(dto: CreateIFDto) {
    const config = this.configService.get('if')
    if (dto.type === IFType.INSERTION_FINDER && dto.scramble === '') {
      throw new BadRequestException('Invalid scramble')
    }
    // ignore scramble, algs and greedy
    if (dto.type === IFType.SLICEY_FINDER) {
      dto.scramble = ''
      dto.algs = []
      dto.greedy = 2
    }
    dto.algs.sort()
    try {
      dto.scramble = formatAlgorithm(dto.scramble)
    } catch {
      throw new BadRequestException('Invalid scramble')
    }
    if (dto.scramble.split(/\s+/).length > config.scrambleLength) {
      throw new BadRequestException('Invalid scramble')
    }
    let formattedSkeleton: string
    let bestCube: Cube
    try {
      ;({ bestCube, formattedSkeleton } = formatSkeleton(dto.scramble, dto.skeleton))
    } catch {
      throw new BadRequestException('Invalid skeleton')
    }
    if (formattedSkeleton.split(' ').length > config.maxSkeletonLength) {
      throw new BadRequestException('Invalid skeleton')
    }
    const greedyObj = dto.greedy === 2 ? {} : { greedy: dto.greedy }
    const hash = calculateHash(
      Object.assign(
        {
          scramble: dto.scramble,
          skeleton: dto.skeleton,
          algs: dto.algs,
        },
        greedyObj,
      ),
    )

    let insertionFinder = await this.insertionFindersRepository.findOneBy({ hash })
    if (!insertionFinder) {
      insertionFinder = new InsertionFinders()
      insertionFinder.hash = hash
      insertionFinder.skeleton = dto.skeleton
    }
    const realHash = calculateHash(
      Object.assign(
        {
          scramble: dto.scramble,
          skeleton: formattedSkeleton,
          algs: dto.algs,
        },
        greedyObj,
      ),
    )
    let realIF = await this.realInsertionFindersRepository.findOneBy({ hash: realHash })
    if (!realIF) {
      const cornerCycles = bestCube.getCornerCycles()
      const edgeCycles = bestCube.getEdgeCycles()
      const placement = bestCube.placement
      const centerCycles = centerCycleTable[placement]
      const parity = bestCube.hasParity()
      const totalCycles = (centerCycles > 1 ? 0 : Number(parity) * 3) + (cornerCycles + edgeCycles + centerCycles) * 2
      realIF = new RealInsertionFinders()
      realIF.type = dto.type
      realIF.hash = realHash
      realIF.version = config.version[dto.type]
      realIF.scramble = dto.scramble
      realIF.skeleton = formattedSkeleton
      realIF.greedy = dto.greedy
      realIF.totalCycles = totalCycles
      realIF.cornerCycles = cornerCycles
      realIF.edgeCycles = edgeCycles
      realIF.centerCycles = centerCycles
      realIF.parity = parity
      realIF.cycleDetail = {
        corner: bestCube.getCornerStatus(),
        edge: bestCube.getEdgeStatus(),
        center:
          centerCycles > 0
            ? [
                {
                  length: centerLength(centerCycles, placement),
                },
              ]
            : [],
      }
      realIF.result = {}
      realIF.status = IFStatus.PENDING
      realIF.algs = dto.algs.map(a => {
        const alg = new Algs()
        alg.name = a
        return alg
      })
      await this.realInsertionFindersRepository.save(realIF)
      await this.addIFJob(realIF)
    }
    insertionFinder.realInsertionFinder = realIF
    await this.insertionFindersRepository.save(insertionFinder)
    return insertionFinder
  }

  async addIFJob(realIF: RealInsertionFinders) {
    if (realIF.isSF) {
      await this.sfQueue.add({
        hash: realIF.hash,
      })
    } else if (realIF.greedy > 2) {
      await this.ifHGQueue.add({
        hash: realIF.hash,
      })
    } else {
      await this.ifQueue.add({
        hash: realIF.hash,
      })
    }
  }
}
