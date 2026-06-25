import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'

import { Competitions } from './competitions.entity'
import { LeagueSeasons } from './league-seasons.entity'
import { Users } from './users.entity'

@Entity()
export class LeagueEloHistories {
  @PrimaryGeneratedColumn()
  id: number

  @Column()
  seasonId: number

  @Column()
  competitionId: number

  @Column()
  week: number

  @Column()
  userId: number

  @Column({ default: 0 })
  points: number

  @Column({ default: 0 })
  delta: number

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date

  @ManyToOne(() => LeagueSeasons, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  season: LeagueSeasons

  @ManyToOne(() => Competitions, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  competition: Competitions

  @ManyToOne(() => Users, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  user: Users
}
