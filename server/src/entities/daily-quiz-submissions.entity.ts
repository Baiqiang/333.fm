import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn } from 'typeorm'

import { DailyQuizzes } from './daily-quizzes.entity'
import { Users } from './users.entity'

@Entity()
@Index(['quizId', 'userId'], { unique: true })
export class DailyQuizSubmissions {
  @PrimaryGeneratedColumn()
  id: number

  @Column()
  quizId: number

  @Column()
  userId: number

  @Column({ type: 'json' })
  answers: number[][]

  @Column({ default: 0 })
  correctCount: number

  @Column({ default: 0 })
  totalQuestions: number

  @Column({ type: 'bigint', default: 0 })
  remainingTime: number

  @Column({ type: 'bigint', nullable: true, default: null })
  startedAt: number

  @Column({ default: false })
  finished: boolean

  @CreateDateColumn()
  createdAt: Date

  @ManyToOne(() => DailyQuizzes, quiz => quiz.submissions, { onDelete: 'CASCADE' })
  quiz: DailyQuizzes

  @ManyToOne(() => Users, { onDelete: 'CASCADE' })
  user: Users
}
