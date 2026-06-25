import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'

import { Users } from './users.entity'

@Entity()
export class LeagueElos {
  @PrimaryGeneratedColumn()
  id: number

  @Column()
  userId: number

  @Column({ default: 0 })
  points: number

  @ManyToOne(() => Users, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  user: Users

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
