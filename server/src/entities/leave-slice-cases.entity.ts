import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm'

export interface LeaveSliceSolution {
  length: number
  solution: string
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
