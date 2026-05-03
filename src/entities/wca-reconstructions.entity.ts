import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'

import { Competitions } from './competitions.entity'
import { Users } from './users.entity'

export interface WcaOfficialRoundResult {
  roundNumber: number
  roundTypeId: string
  pos: number
  best: number
  average: number
  attempts: number[]
  regionalSingleRecord: string | null
  regionalAverageRecord: string | null
}

export interface WcaReconData {
  officialResults?: WcaOfficialRoundResult[]
  officialNonParticipant?: boolean
  officialNonParticipantAt?: string
}

@Entity()
@Index(['competitionId', 'userId'], { unique: true })
export class WcaReconstructions {
  @PrimaryGeneratedColumn()
  id: number

  @Column()
  competitionId: number

  @Column()
  userId: number

  @Column({ type: 'text', nullable: true, default: null })
  description: string | null

  @Column({ default: true })
  isParticipant: boolean

  @Column({ type: 'json', nullable: true, default: null })
  wcaData: WcaReconData | null

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date

  @ManyToOne(() => Competitions, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  competition: Competitions

  @ManyToOne(() => Users, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
    eager: true,
  })
  user: Users
}
