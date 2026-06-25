import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'

import { DRTriggerGameRounds } from './dr-trigger-game-rounds.entity'
import { Users } from './users.entity'

export enum DRTriggerGameStatus {
  ONGOING,
  ENDED,
}

@Entity()
@Index(['userId', 'status'])
export class DRTriggerGames {
  @PrimaryGeneratedColumn()
  id: number

  @Column()
  @Index()
  userId: number

  @Column({ default: DRTriggerGameStatus.ONGOING })
  status: DRTriggerGameStatus

  @Column({ type: 'bigint', default: 600000 })
  remainingTime: number

  @Column({ default: 0 })
  totalTimeBonus: number

  @Column({ default: 0 })
  levels: number

  @Column({ default: 5 })
  @Index()
  difficulty: number

  @Column({ length: 20, nullable: true, default: null })
  @Index()
  rzp: string | null

  @Column({ nullable: true, default: null })
  currentTriggerId: number

  @Column({ type: 'bigint', nullable: true, default: null })
  currentRoundStartedAt: number

  @Column({ default: true })
  @Index()
  merged: boolean

  @Column({ default: false })
  @Index()
  practice: boolean

  @Column({ length: 1024, default: '' })
  sessionHash: string

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date

  @ManyToOne(() => Users, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  user: Users

  @OneToMany(() => DRTriggerGameRounds, round => round.game)
  rounds: DRTriggerGameRounds[]
}
