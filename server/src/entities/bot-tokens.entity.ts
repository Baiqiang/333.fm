import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'

import { Users } from './users.entity'

export const enum TokenStatus {
  Active = 'active',
  Revoked = 'revoked',
}

@Entity()
export class BotTokens {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ length: 130 })
  @Index()
  token: string

  @Column()
  status: TokenStatus

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date

  @Column()
  userId: number

  @ManyToOne(() => Users, users => users.roles, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  user: Users
}
