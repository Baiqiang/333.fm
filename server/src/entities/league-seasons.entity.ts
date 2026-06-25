import { Expose } from 'class-transformer'
import { Column, CreateDateColumn, Entity, Index, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'

import { Competitions } from './competitions.entity'
import { LeagueEloHistories } from './league-elo-histories.entity'
import { LeaguePlayers } from './league-players.entity'
import { LeagueStandings } from './league-standings.entity'
import { LeagueTiers } from './league-tiers.entity'

export enum LeagueSeasonStatus {
  NOT_STARTED,
  ON_GOING,
  ENDED,
}

@Entity()
export class LeagueSeasons {
  @PrimaryGeneratedColumn()
  id: number

  @Column()
  @Index({ unique: true })
  number: number // e.g. 6

  @Column()
  startTime: Date

  @Column()
  endTime: Date

  @Column()
  status: LeagueSeasonStatus

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date

  @OneToMany(() => LeagueTiers, (tier: LeagueTiers) => tier.season)
  tiers: LeagueTiers[]

  @OneToMany(() => Competitions, competition => competition.leagueSeason, {
    onDelete: 'CASCADE',
  })
  competitions: Competitions[]

  @OneToMany(() => LeagueStandings, standings => standings.season)
  standings: LeagueStandings[]

  @OneToMany(() => LeagueEloHistories, eloHistory => eloHistory.season)
  eloHistories: LeagueEloHistories[]

  @OneToMany(() => LeaguePlayers, player => player.season)
  players: LeaguePlayers[]

  // Non-persisted: current ELO for each player in this season
  elos: Record<number, number>

  @Expose()
  get title() {
    return `FMC League S${this.number}`
  }
}
