import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { Algs } from '@/entities/algs.entity'
import { InsertionFinders } from '@/entities/insertion-finders.entity'
import { RealInsertionFinders } from '@/entities/real-insertion-finders.entity'
import { UserInsertionFinders } from '@/entities/user-insertion-finders.entity'
import { UserRoles } from '@/entities/user-roles.entity'
import { Users } from '@/entities/users.entity'
import { UserModule } from '@/user/user.module'

import { AdminController } from './admin.controller'
import { AdminService } from './admin.service'

@Module({
  imports: [
    TypeOrmModule.forFeature([Algs, InsertionFinders, RealInsertionFinders, UserInsertionFinders, UserRoles, Users]),
    UserModule,
  ],
  providers: [AdminService],
  controllers: [AdminController],
})
export class AdminModule {}
