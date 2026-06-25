import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'

import { ColumnNumericTransformer } from '@/utils'

import { Competitions } from './competitions.entity'
import { Users } from './users.entity'

export enum PointSource {
  WEEKLY = 'weekly',
  DAILY = 'daily',
  ENDLESS_BOSS = 'endless_boss',
  ENDLESS_REGULAR = 'endless_regular',
  LEAGUE = 'league',
}

@Entity()
@Index(['userId', 'source'])
export class UserPoints {
  @PrimaryGeneratedColumn()
  id: number

  @Column()
  @Index()
  userId: number

  @Column({ nullable: true })
  competitionId: number | null

  @Column({ length: 32 })
  @Index()
  source: PointSource

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, transformer: new ColumnNumericTransformer() })
  points: number

  @Column({ type: 'json', nullable: true })
  pointDetails: Record<string, number> | null

  @Column()
  earnedAt: Date

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date

  @ManyToOne(() => Users, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  user: Users

  @ManyToOne(() => Competitions, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
    nullable: true,
  })
  competition: Competitions
}
