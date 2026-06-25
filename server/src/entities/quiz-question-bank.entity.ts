import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm'

import { QuestionType, type QuizQuestion } from './daily-quizzes.entity'

@Entity()
export class QuizQuestionBank {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ type: 'int' })
  type: QuestionType

  @Column({ default: false })
  negative: boolean

  @Column({ default: false })
  allC: boolean

  @Column({ type: 'json' })
  question: QuizQuestion

  @Column({ default: false })
  @Index()
  used: boolean

  @CreateDateColumn()
  createdAt: Date
}
