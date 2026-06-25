import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinTable,
  ManyToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'

import { Submissions } from './submissions.entity'
import { Users } from './users.entity'

@Entity()
@Index(['submissionId', 'createdAt'])
export class Comments {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ length: 2048 })
  content: string

  @Column()
  submissionId: number

  @Column()
  userId: number

  @Column({ nullable: true })
  replyToId: number

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date

  @ManyToOne(() => Submissions, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  submission: Submissions

  @ManyToOne(() => Users, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  user: Users

  @ManyToOne(() => Comments, {
    nullable: true,
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  })
  replyTo: Comments

  @ManyToMany(() => Users)
  @JoinTable()
  mentions: Users[]
}
