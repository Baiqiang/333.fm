import { Expose } from 'class-transformer'
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'

import { ColumnNumericTransformer } from '@/utils'

import { Competitions } from './competitions.entity'
import { LeagueSeasons } from './league-seasons.entity'
import { LeagueTiers } from './league-tiers.entity'
import { Results } from './results.entity'
import { Users } from './users.entity'

@Entity()
export class LeagueDuels {
  @PrimaryGeneratedColumn()
  id: number

  @Column()
  seasonId: number

  @Column()
  competitionId: number

  @Column()
  tierId: number

  // null when the slot is a bye (轮空), e.g. tiers with fewer players than weeks
  @Column({ nullable: true })
  user1Id: number | null

  // for odd number of players, the last player will be the bye player
  @Column({ nullable: true })
  user2Id: number | null

  @Column({ default: 0, type: 'decimal', precision: 10, scale: 1, transformer: new ColumnNumericTransformer() })
  user1Points: number

  @Column({ default: 0, type: 'decimal', precision: 10, scale: 1, transformer: new ColumnNumericTransformer() })
  user2Points: number

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date

  @ManyToOne(() => LeagueSeasons, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  season: LeagueSeasons

  @ManyToOne(() => Competitions, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({
    name: 'competition_id',
  })
  competition: Competitions

  @ManyToOne(() => LeagueTiers, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  tier: LeagueTiers

  @ManyToOne(() => Users, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  user1: Users

  @ManyToOne(() => Users, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  user2: Users

  user1Result?: Results
  user2Result?: Results

  @Expose()
  get ended() {
    return this.user1Points + this.user2Points > 0
  }

  getUserPoints(user: Users) {
    return this.user1Id === user.id ? this.user1Points : this.user2Points
  }

  getOpponent(user: Users) {
    return this.user1Id === user.id ? this.user2 : this.user1
  }

  getUserResult(user: Users) {
    return this.user1Id === user.id ? this.user1Result : this.user2Result
  }
}
