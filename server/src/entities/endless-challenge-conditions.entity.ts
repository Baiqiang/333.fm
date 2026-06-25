import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'

import { Competitions } from './competitions.entity'
import { Scrambles } from './scrambles.entity'
import { Submissions } from './submissions.entity'
import { Users } from './users.entity'

export enum ConditionType {
  MOVES_EQUAL = 'moves-equal',
  MOVES_LE = 'moves-le',
  MOVES_GE = 'moves-ge',
  MOVES_PARITY = 'moves-parity',
  SAME_SOLUTION = 'same-solution',
  SAME_MOVES = 'same-moves',
  ALL_DIFFERENT_MOVES = 'all-different-moves',
  TOTAL_SUBMISSIONS = 'total-submissions',
  CONSECUTIVE_MOVES = 'consecutive-moves',
}

export enum ParityType {
  EVEN = 'even',
  ODD = 'odd',
  MULTIPLE_OF_3 = 'multiple-of-3',
  MULTIPLE_OF_5 = 'multiple-of-5',
  MULTIPLE_OF_7 = 'multiple-of-7',
}

export interface MovesEqualParams {
  moves: number
  count?: number
}

export interface MovesLeParams {
  moves: number
  count?: number
}

export interface MovesGeParams {
  moves: number
  count?: number
}

export interface MovesParityParams {
  parity: ParityType
}

export interface SameSolutionParams {
  count: number
}

export interface SameMovesParams {
  count: number
}

export interface AllDifferentMovesParams {
  minSubmissions: number
}

export interface TotalSubmissionsParams {
  count: number
}

export interface ConsecutiveMovesParams {
  count: number
  diff: number
}

export type ConditionParams =
  | MovesEqualParams
  | MovesLeParams
  | MovesGeParams
  | MovesParityParams
  | SameSolutionParams
  | SameMovesParams
  | AllDifferentMovesParams
  | TotalSubmissionsParams
  | ConsecutiveMovesParams

@Entity()
@Index(['competitionId', 'scrambleId'])
export class EndlessChallengeConditions {
  @PrimaryGeneratedColumn()
  id: number

  @Column()
  competitionId: number

  @Column()
  scrambleId: number

  @Column({ length: 32 })
  type: ConditionType

  @Column({ type: 'json' })
  params: ConditionParams

  @Column({ default: false })
  revealed: boolean

  @Column({ default: false })
  autoRevealed: boolean

  @Column({ nullable: true, default: null })
  triggeredByUserId: number | null

  @Column({ nullable: true, default: null })
  triggeredBySubmissionId: number | null

  @Column({ type: 'json', nullable: true, default: null })
  contributors: { userId: number; submissionId: number }[] | null

  @Column({ nullable: true, default: null })
  revealedAt: Date | null

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date

  @ManyToOne(() => Competitions, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  competition: Competitions

  @ManyToOne(() => Scrambles, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  scramble: Scrambles

  @ManyToOne(() => Users, { nullable: true, onDelete: 'SET NULL' })
  triggeredByUser: Users | null

  @ManyToOne(() => Submissions, { nullable: true, onDelete: 'SET NULL' })
  triggeredBySubmission: Submissions | null

  get description(): string {
    switch (this.type) {
      case ConditionType.MOVES_EQUAL: {
        const { moves, count: n } = this.params as MovesEqualParams
        return n && n > 1 ? `${n} people = ${moves / 100} moves` : `= ${moves / 100} moves`
      }
      case ConditionType.MOVES_LE: {
        const { moves, count: n } = this.params as MovesLeParams
        return n && n > 1 ? `${n} people ≤ ${moves / 100} moves` : `≤ ${moves / 100} moves`
      }
      case ConditionType.MOVES_GE: {
        const { moves, count: n } = this.params as MovesGeParams
        return n && n > 1 ? `${n} people ≥ ${moves / 100} moves` : `≥ ${moves / 100} moves`
      }
      case ConditionType.MOVES_PARITY:
        return `${(this.params as MovesParityParams).parity} moves`
      case ConditionType.SAME_SOLUTION:
        return `${(this.params as SameSolutionParams).count} identical solutions`
      case ConditionType.SAME_MOVES:
        return `${(this.params as SameMovesParams).count} same move count`
      case ConditionType.ALL_DIFFERENT_MOVES:
        return `${(this.params as AllDifferentMovesParams).minSubmissions}+ submissions, all different`
      case ConditionType.TOTAL_SUBMISSIONS:
        return `${(this.params as TotalSubmissionsParams).count}+ submissions`
      case ConditionType.CONSECUTIVE_MOVES: {
        const { count, diff } = this.params as ConsecutiveMovesParams
        return `${count} submissions in arithmetic sequence (diff=${diff / 100})`
      }
      default:
        return ''
    }
  }
}
