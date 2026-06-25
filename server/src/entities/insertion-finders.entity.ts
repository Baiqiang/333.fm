import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'

import { RealInsertionFinders } from './real-insertion-finders.entity'
import { UserInsertionFinders } from './user-insertion-finders.entity'

export enum IFType {
  INSERTION_FINDER = 0,
  SLICEY_FINDER = 1,
}

export enum IFStatus {
  PENDING = 0,
  COMPUTING = 1,
  FINISHED = 2,
}

@Entity()
export class InsertionFinders {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ length: 32 })
  @Index()
  hash: string

  @Column({ length: 2048 })
  skeleton: string

  @CreateDateColumn()
  @Index()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date

  @ManyToOne(() => RealInsertionFinders, realInsertionFinders => realInsertionFinders.insertionFinders, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  realInsertionFinder: RealInsertionFinders

  @OneToMany(() => UserInsertionFinders, userInsertionFinders => userInsertionFinders.insertionFinder)
  userInsertionFinders: UserInsertionFinders[]

  get summary() {
    return {
      type: this.realInsertionFinder.type,
      hash: this.hash,
      scramble: this.realInsertionFinder.scramble,
      skeleton: this.skeleton,
      realSkeleton: this.realInsertionFinder.skeleton,
      greedy: this.realInsertionFinder.greedy,
      totalCycles: this.realInsertionFinder.totalCycles,
      cycles: {
        corners: this.realInsertionFinder.cornerCycles,
        edges: this.realInsertionFinder.edgeCycles,
        centers: this.realInsertionFinder.centerCycles,
        parity: this.realInsertionFinder.parity,
      },
      cycleDetail: this.realInsertionFinder.cycleDetail,
      result: this.realInsertionFinder.result,
      status: this.realInsertionFinder.status,
      createdAt: this.createdAt,
    }
  }

  get detail() {
    return {
      ...this.summary,
      algs: (this.realInsertionFinder.algs ?? []).map(({ name }) => name),
    }
  }
}
