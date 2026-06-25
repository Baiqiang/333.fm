import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm'

export interface DRTriggerSolution {
  length: number
  eoBreaking: boolean
  trigger: number
  solution: string
}

@Entity()
@Index(['rzp', 'optimalMoves'])
export class DRTriggers {
  @PrimaryGeneratedColumn()
  id: number

  @Column()
  @Index()
  caseId: number

  @Column({ length: 20 })
  @Index()
  rzp: string

  @Column({ length: 20 })
  @Index()
  arm: string

  @Column({ default: 0 })
  pairs: number

  @Column({ length: 50, nullable: true, default: null })
  tetrad: string | null

  @Column({ length: 50, nullable: true, default: null })
  corners: string | null

  @Column({ default: 0 })
  @Index()
  optimalMoves: number

  @Column({ default: false })
  eoBreaking: boolean

  @Column({ default: false })
  eoBreakingOnly: boolean

  @Column({ type: 'json' })
  solutions: DRTriggerSolution[]

  @Column({ length: 32, nullable: true, default: null })
  @Index()
  symmetryGroup: string | null

  @Column({ default: false })
  @Index()
  isSymmetryRepresentative: boolean

  @CreateDateColumn()
  createdAt: Date
}
