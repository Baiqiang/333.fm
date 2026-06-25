import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'

import { RealInsertionFinders } from './real-insertion-finders.entity'

export enum ValidAlgs {
  '3CP' = '3CP',
  '3CP-pure' = '3CP-pure',
  '2x2CP' = '2x2CP',
  'CO' = 'CO',
  'C-other' = 'C-other',
  '3EP' = '3EP',
  '2x2EP' = '2x2EP',
  'EO' = 'EO',
  'E-other' = 'E-other',
  'parity' = 'parity',
  'center' = 'center',
  '3CP3EP' = '3CP3EP',
  'no-parity-other' = 'no-parity-other',
  'extras/parity' = 'extras/parity',
  'extras/no-parity-other' = 'extras/no-parity-other',
}

@Entity()
export class Algs {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ length: 255 })
  @Index()
  name: string

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date

  @ManyToOne(() => RealInsertionFinders, realInsertionFinders => realInsertionFinders.algs, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  realInsertionFinder: RealInsertionFinders
}
