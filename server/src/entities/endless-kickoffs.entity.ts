import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'

import { Competitions } from './competitions.entity'
import { Scrambles } from './scrambles.entity'
import { Submissions } from './submissions.entity'
import { Users } from './users.entity'

@Entity()
@Index(['competitionId', 'userId'])
export class EndlessKickoffs {
  @PrimaryGeneratedColumn()
  id: number

  @Column()
  competitionId: number

  @Column()
  scrambleId: number

  @Column()
  userId: number

  @Column()
  submissionId: number

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date

  @ManyToOne(() => Competitions, competition => competition.scrambles, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  competition: Competitions

  @ManyToOne(() => Scrambles, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  scramble: Scrambles

  @ManyToOne(() => Users, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  user: Users

  @ManyToOne(() => Submissions, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  submission: Submissions

  removeSolution() {
    this.submission?.removeSolution()
  }
}
