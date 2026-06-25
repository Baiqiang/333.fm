import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  UpdateDateColumn,
} from 'typeorm'

import { InsertionFinders } from './insertion-finders.entity'
import { Users } from './users.entity'

@Entity('user_insertion_finders')
export class UserInsertionFinders {
  @Column({ primary: true })
  insertionFinderId: number

  @Column({ primary: true })
  @Index()
  userId: number

  @Column({ length: 255 })
  name: string

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date

  @DeleteDateColumn()
  deletedAt: Date | null

  @ManyToOne(() => InsertionFinders, insertionFinders => insertionFinders.userInsertionFinders, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn([{ name: 'insertion_finder_id', referencedColumnName: 'id' }])
  insertionFinder: InsertionFinders

  @ManyToOne(() => Users, users => users.userInsertionFinders, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn([{ name: 'user_id', referencedColumnName: 'id' }])
  user: Users

  get summary() {
    return {
      name: this.name,
      ...this.insertionFinder.summary,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    }
  }
}
