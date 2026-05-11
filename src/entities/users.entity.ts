import { Exclude } from 'class-transformer'
import { Column, CreateDateColumn, Entity, Index, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'

import { Competitions } from './competitions.entity'
import { LeagueDuels } from './league-duels.entity'
import { Submissions } from './submissions.entity'
import { UserInsertionFinders } from './user-insertion-finders.entity'
import { UserRoles } from './user-roles.entity'

@Entity()
@Index(['source', 'sourceId'])
@Index(['source', 'wcaId'])
export class Users {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ length: 255 })
  name: string

  @Column({ unique: true, length: 255 })
  @Exclude()
  email: string

  @Column({ length: 10 })
  wcaId: string

  @Column({ length: 255 })
  avatar: string

  @Column({ length: 255 })
  avatarThumb: string

  @Column()
  source: string

  @Column()
  sourceId: string

  @Column({ nullable: true })
  primaryUserId: number

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date

  @OneToMany(() => UserInsertionFinders, userInsertionFinders => userInsertionFinders.user)
  userInsertionFinders: UserInsertionFinders[]

  @OneToMany(() => UserRoles, userRoles => userRoles.user)
  roles: UserRoles[]

  @OneToMany(() => Competitions, competition => competition.user)
  competitions: Competitions[]

  @OneToMany(() => Submissions, submission => submission.user)
  submissions: Submissions[]

  @OneToMany(() => LeagueDuels, duel => duel.user1)
  duelsAsUser1: LeagueDuels[]

  practices: number
  practiceAttendees: number
}
