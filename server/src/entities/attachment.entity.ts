import { Expose } from 'class-transformer'
import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'

import { UPLOAD_CONFIG } from '@/config/configuration'

import { Users } from './users.entity'

@Entity()
export class Attachments {
  @PrimaryGeneratedColumn()
  id: number

  @Column()
  userId: number

  @Column({ type: 'char', length: 32 })
  @Index()
  hash: string

  @Column()
  type: string

  @Column()
  name: string

  @Expose()
  get url() {
    return `${UPLOAD_CONFIG.BASE_URL}/${this.hash.slice(0, 2)}/${this.hash.slice(2, 4)}/${this.hash}-${this.name}`
  }

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date

  @ManyToOne(() => Users, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  user: Users
}
