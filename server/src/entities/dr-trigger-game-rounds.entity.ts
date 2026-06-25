import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm'

import { DRTriggerGames } from './dr-trigger-games.entity'
import { DRTriggers } from './dr-triggers.entity'

@Entity()
export class DRTriggerGameRounds {
  @PrimaryGeneratedColumn()
  id: number

  @Column()
  gameId: number

  @Column()
  triggerId: number

  @Column({ length: 512 })
  scramble: string

  @Column({ length: 255 })
  solution: string

  @Column()
  moves: number

  @Column()
  optimalMoves: number

  @Column({ default: 0 })
  timeBonus: number

  @Column({ type: 'bigint' })
  duration: number

  @CreateDateColumn()
  createdAt: Date

  @ManyToOne(() => DRTriggerGames, game => game.rounds, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  game: DRTriggerGames

  @ManyToOne(() => DRTriggers, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  trigger: DRTriggers
}
