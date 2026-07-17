import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm'

export type LeaveSliceSolutionType = 'htr' | 'ud-qt' | 'dr-breaking'

export interface LeaveSliceSolution {
  length: number
  solution: string
  type: LeaveSliceSolutionType
}

@Entity()
export class LeaveSliceCases {
  @PrimaryGeneratedColumn()
  id: number

  @Column()
  @Index()
  caseId: number

  @Column({ length: 200 })
  setup: string

  @Column({ default: 0 })
  @Index()
  optimalMoves: number

  /** Optimal length using DR moves (U/D quarter turns allowed). Always <= optimalMoves. */
  @Column({ default: 0 })
  qtOptimalMoves: number

  /** Optimal length breaking DR (any of the 18 moves), only when strictly shorter than qtOptimalMoves. */
  @Column({ type: 'int', nullable: true, default: null })
  drBreakingOptimalMoves: number | null

  @Column({ type: 'json' })
  solutions: LeaveSliceSolution[]

  @Column({ length: 32, nullable: true, default: null })
  @Index()
  symmetryGroup: string | null

  @Column({ default: false })
  @Index()
  isSymmetryRepresentative: boolean

  @CreateDateColumn()
  createdAt: Date
}
