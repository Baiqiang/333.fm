import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { IPaginationOptions, paginate } from 'nestjs-typeorm-paginate'
import { Repository } from 'typeorm'

import { Tutorials } from '@/entities/tutorials.entity'

import { CreateTutorialDto } from './dto/create-tutorial.dto'
import { SortTutorialItem } from './dto/sort-tutorial.dto'
import { UpdateTutorialDto } from './dto/update-tutorial.dto'

@Injectable()
export class TutorialService {
  constructor(
    @InjectRepository(Tutorials)
    private readonly tutorialRepository: Repository<Tutorials>,
  ) {}

  findAll() {
    return this.tutorialRepository.find({ order: { sort: 'ASC', id: 'ASC' } })
  }

  findAllPaginated(options: IPaginationOptions) {
    return paginate<Tutorials>(this.tutorialRepository, options, {
      order: { sort: 'ASC', id: 'ASC' },
    })
  }

  findOne(id: number) {
    return this.tutorialRepository.findOneBy({ id })
  }

  create(dto: CreateTutorialDto) {
    const tutorial = this.tutorialRepository.create(dto)
    return this.tutorialRepository.save(tutorial)
  }

  async update(id: number, dto: UpdateTutorialDto) {
    await this.tutorialRepository.update(id, dto)
    return this.findOne(id)
  }

  async remove(id: number) {
    await this.tutorialRepository.delete(id)
  }

  async batchSort(items: SortTutorialItem[]) {
    await this.tutorialRepository.manager.transaction(async manager => {
      for (const item of items) {
        await manager.update(Tutorials, item.id, { sort: item.sort, category: item.category })
      }
    })
  }
}
