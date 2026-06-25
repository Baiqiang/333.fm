import { Column, CreateDateColumn, Entity, Index, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'

import { Algs } from './algs.entity'
import { IFStatus, IFType, InsertionFinders } from './insertion-finders.entity'

@Entity()
@Index(['type', 'greedy'])
export class RealInsertionFinders {
  @PrimaryGeneratedColumn({ type: 'int' })
  id: number

  @Column()
  type: IFType

  @Column({ type: 'char', length: 32 })
  @Index()
  hash: string

  @Column({ length: 32 })
  version: string

  @Column({ length: 255 })
  scramble: string

  @Column({ length: 2048 })
  skeleton: string

  @Column({ type: 'tinyint', unsigned: true, default: 2 })
  greedy: number

  @Column({ type: 'tinyint', default: 0 })
  @Index()
  totalCycles: number

  @Column({ type: 'tinyint', default: 0 })
  cornerCycles: number

  @Column({ type: 'tinyint', default: 0 })
  edgeCycles: number

  @Column({ type: 'tinyint', default: 0 })
  centerCycles: number

  @Column({ default: false })
  parity: boolean

  @Column('json')
  cycleDetail: object

  @Column('json')
  result: object

  @Column()
  @Index()
  status: IFStatus

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date

  @OneToMany(() => Algs, algs => algs.realInsertionFinder, { cascade: true })
  algs: Algs[]

  @OneToMany(() => InsertionFinders, insertionFinders => insertionFinders.realInsertionFinder)
  insertionFinders: InsertionFinders[]

  get isIF() {
    return this.type === IFType.INSERTION_FINDER
  }

  get isSF() {
    return this.type === IFType.SLICEY_FINDER
  }
}
