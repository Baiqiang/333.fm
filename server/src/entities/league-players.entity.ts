import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'

import { LeagueSeasons } from './league-seasons.entity'
import { LeagueTiers } from './league-tiers.entity'
import { Users } from './users.entity'

@Entity()
export class LeaguePlayers {
  @PrimaryGeneratedColumn()
  id: number

  @Column()
  seasonId: number

  @Column()
  tierId: number

  @Column({ nullable: true })
  userId: number

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date

  @ManyToOne(() => LeagueSeasons, season => season.players, {
    onDelete: 'CASCADE',
  })
  season: LeagueSeasons

  @ManyToOne(() => LeagueTiers, tier => tier.players, {
    onDelete: 'CASCADE',
  })
  tier: LeagueTiers

  @ManyToOne(() => Users, {
    onDelete: 'CASCADE',
  })
  user: Users
}
