import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'

import { LeagueSeasons } from './league-seasons.entity'
import { Users } from './users.entity'

@Entity()
@Index(['seasonId', 'userId'], { unique: true })
export class LeagueParticipants {
  @PrimaryGeneratedColumn()
  id: number

  @Column()
  seasonId: number

  @Column()
  userId: number

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date

  @ManyToOne(() => LeagueSeasons, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  season: LeagueSeasons

  @ManyToOne(() => Users, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  user: Users
}
