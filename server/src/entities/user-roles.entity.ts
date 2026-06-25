import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'

import { Users } from './users.entity'

@Entity()
export class UserRoles {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ length: 255 })
  @Index()
  name: string

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date

  @Column()
  userId: number

  @ManyToOne(() => Users, users => users.roles, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  user: Users
}
