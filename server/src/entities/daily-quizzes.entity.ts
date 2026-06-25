import { Column, CreateDateColumn, Entity, Index, OneToMany, PrimaryGeneratedColumn } from 'typeorm'

import { DailyQuizSubmissions } from './daily-quiz-submissions.entity'

export enum QuestionType {
  DR_BEST_HTR = 1,
  DR_VALID_HTR = 2,
  DR_QT_STEP = 3,
  HTR_BEST_LEAVE_SLICE = 4,
}

export interface QuizOption {
  label: string
  solution: string
  correct: boolean
}

export interface QuizQuestion {
  type: QuestionType
  negative: boolean
  scramble: string
  drAxis?: string
  lastMove?: string
  options: QuizOption[]
}

@Entity()
export class DailyQuizzes {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ length: 10 })
  @Index({ unique: true })
  day: string

  @Column({ type: 'json' })
  questions: QuizQuestion[]

  @Column({ default: false })
  allC: boolean

  @CreateDateColumn()
  createdAt: Date

  @OneToMany(() => DailyQuizSubmissions, s => s.quiz)
  submissions: DailyQuizSubmissions[]
}
