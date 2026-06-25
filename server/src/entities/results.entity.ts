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

import { calculateAverage, calculateMean } from '@/utils'

import { CompetitionMode, Competitions } from './competitions.entity'
import { Submissions } from './submissions.entity'
import { Users } from './users.entity'

export const DNF = 99999998
export const DNS = 99999999

@Entity()
@Index(['competitionId', 'userId'])
@Index(['competitionId', 'best'])
@Index(['competitionId', 'average', 'best'])
export class Results {
  @PrimaryGeneratedColumn()
  id: number

  @Column()
  mode: CompetitionMode

  @Column({ default: 0 })
  rank: number

  @Column('json')
  values: number[]

  @Column()
  best: number

  @Column()
  average: number

  @Column()
  competitionId: number

  @Column()
  userId: number

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

  @OneToMany(() => Submissions, submission => submission.result)
  submissions: Submissions[]

  rollingStart: number

  cloneRolling(start: number, n: number, mean = false): Results {
    const result = new Results()
    result.mode = this.mode
    result.values = this.values.slice(start, start + n)
    result.best = Math.min(...result.values)
    result.rollingStart = start
    if (mean) {
      result.average = calculateMean(result.values)
    } else {
      result.average = calculateAverage(result.values)
    }
    result.competitionId = this.competitionId
    result.userId = this.userId
    result.user = this.user
    return result
  }

  updateBestAndAverage() {
    this.best = Math.min(...this.values.filter(v => v > 0))
    this.average = calculateMean(this.values.filter(v => v > 0))
    if (this.values.some(v => v === DNF || v === DNS)) {
      this.average = DNF
    }
  }
}
