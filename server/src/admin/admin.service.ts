import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { IPaginationOptions, paginate, Pagination } from 'nestjs-typeorm-paginate'
import { Repository } from 'typeorm'

import { Algs } from '@/entities/algs.entity'
import { InsertionFinders } from '@/entities/insertion-finders.entity'
import { RealInsertionFinders } from '@/entities/real-insertion-finders.entity'
import { UserInsertionFinders } from '@/entities/user-insertion-finders.entity'
import { UserRoles } from '@/entities/user-roles.entity'
import { Users } from '@/entities/users.entity'

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Algs)
    private readonly algsRepository: Repository<Algs>,
    @InjectRepository(InsertionFinders)
    private readonly insertionFindersRepository: Repository<InsertionFinders>,
    @InjectRepository(RealInsertionFinders)
    private readonly realInsertionFindersRepository: Repository<RealInsertionFinders>,
    @InjectRepository(UserInsertionFinders)
    private readonly userInsertionFindersRepository: Repository<UserInsertionFinders>,
    @InjectRepository(UserRoles)
    private readonly userRolesRepository: Repository<UserRoles>,
    @InjectRepository(Users)
    private readonly usersRepository: Repository<Users>,
  ) {}

  getIFs(options: IPaginationOptions): Promise<Pagination<InsertionFinders>> {
    return paginate<InsertionFinders>(this.insertionFindersRepository, options, {
      order: {
        createdAt: 'DESC',
      },
      relations: [
        'realInsertionFinder',
        // 'realInsertionFinder.algs',
        'userInsertionFinders',
        'userInsertionFinders.user',
      ],
    })
  }
}
