import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'

import { Submissions } from './submissions.entity'
import { Users } from './users.entity'

@Entity()
@Index(['userId', 'submissionId'])
@Index(['submissionId', 'like'])
@Index(['submissionId', 'favorite'])
export class UserActivities {
  @PrimaryGeneratedColumn()
  id: number

  @Column()
  userId: number

  @Column()
  submissionId: number

  @Column()
  like: boolean

  @Column()
  favorite: boolean

  @Column()
  decline: boolean

  @Column()
  view: boolean

  // when someone continues a submission
  @Column()
  notify: boolean

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date

  @ManyToOne(() => Users, users => users.roles, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  user: Users

  @ManyToOne(() => Submissions, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  submission: Submissions
}
