import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn } from 'typeorm'

import { Comments } from './comments.entity'
import { Submissions } from './submissions.entity'
import { Users } from './users.entity'

export enum NotificationType {
  COMMENT = 'comment',
  REPLY = 'reply',
  MENTION = 'mention',
  LIKE = 'like',
  FAVORITE = 'favorite',
}

@Entity()
@Index(['userId', 'read', 'createdAt'])
export class Notifications {
  @PrimaryGeneratedColumn()
  id: number

  @Column()
  type: NotificationType

  @Column()
  userId: number

  @Column()
  sourceUserId: number

  @Column({ nullable: true })
  submissionId: number

  @Column({ nullable: true })
  commentId: number

  @Column({ default: false })
  read: boolean

  @CreateDateColumn()
  createdAt: Date

  @ManyToOne(() => Users, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  user: Users

  @ManyToOne(() => Users, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  sourceUser: Users

  @ManyToOne(() => Submissions, {
    nullable: true,
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  submission: Submissions

  @ManyToOne(() => Comments, {
    nullable: true,
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  comment: Comments
}
