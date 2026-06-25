import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'

import { LeagueSeasons } from './league-seasons.entity'
import { LeagueTiers } from './league-tiers.entity'
import { Users } from './users.entity'

@Entity()
export class LeagueStandings {
  @PrimaryGeneratedColumn()
  id: number

  @Column()
  seasonId: number

  @Column()
  tierId: number

  @Column()
  userId: number

  @Column({ default: 0 })
  position: number

  @Column({ default: 0 })
  points: number

  @Column({ default: 0 })
  wins: number

  @Column({ default: 0 })
  losses: number

  @Column({ default: 0 })
  draws: number

  @Column({ default: 0 })
  bestMo3: number

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date

  @ManyToOne(() => LeagueSeasons, season => season.standings, {
    onDelete: 'CASCADE',
  })
  season: LeagueSeasons

  @ManyToOne(() => LeagueTiers, tier => tier.standings, {
    onDelete: 'CASCADE',
  })
  tier: LeagueTiers

  @ManyToOne(() => Users)
  user: Users
}
