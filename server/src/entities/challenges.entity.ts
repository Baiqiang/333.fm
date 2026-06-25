import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'

import { Competitions } from './competitions.entity'
import { DNF, DNS } from './results.entity'

export enum ChallengeType {
  REGULAR,
  BOSS,
}

export interface RegularChallenge {
  single: number
  team: [number, number]
}

export interface BossChallenge {
  instantKill: number
  minHitPoints: number
  maxHitPoints: number
}

export interface ChallengeDefinition {
  type: ChallengeType
  startLevel?: number
  endLevel?: number
  levels?: number[]
  challenge: RegularChallenge | BossChallenge
}

@Entity()
export class Challenges {
  @PrimaryGeneratedColumn()
  id: number

  @Column()
  competitionId: number

  @Column()
  type: ChallengeType

  @Column({ nullable: true })
  startLevel?: number

  @Column({ nullable: true })
  endLevel?: number

  @Column({ nullable: true, type: 'json' })
  levels?: number[]

  @Column({ type: 'json' })
  challenge: RegularChallenge | BossChallenge

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date

  @ManyToOne(() => Competitions, competition => competition.challenges, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  competition: Competitions

  get isBoss(): boolean {
    return this.type === ChallengeType.BOSS
  }

  get isRegular(): boolean {
    return this.type === ChallengeType.REGULAR
  }

  // syntax sugar
  get regularChallenge(): RegularChallenge {
    return this.challenge as RegularChallenge
  }

  get bossChallenge(): BossChallenge {
    return this.challenge as BossChallenge
  }
}

export const defaultChallenge = new Challenges()
defaultChallenge.type = ChallengeType.REGULAR
defaultChallenge.startLevel = 1
defaultChallenge.challenge = { single: 8000, team: [8000, 1] }

export const defaultChallengeDefinition: ChallengeDefinition = {
  type: ChallengeType.REGULAR,
  startLevel: 1,
  challenge: { single: 8000, team: [8000, 1] },
}

export function matchesChallengeLevel(
  challenge: Pick<Challenges, 'levels' | 'startLevel' | 'endLevel'>,
  level: number,
) {
  if (challenge.levels?.includes(level)) {
    return true
  }
  if (challenge.startLevel === undefined || challenge.startLevel === null) {
    return false
  }
  if (level < challenge.startLevel) {
    return false
  }
  return challenge.endLevel === undefined || challenge.endLevel === null || level <= challenge.endLevel
}

export function getRandomBossHitPoints(challenge: BossChallenge) {
  const { minHitPoints, maxHitPoints } = challenge
  return Math.floor(Math.random() * (maxHitPoints - minHitPoints + 1)) + minHitPoints
}

const BOSS_DAMAGE_BY_MOVES: Record<number, number> = {
  26: 6,
  25: 14,
  24: 30,
  23: 60,
  22: 100,
  21: 160,
  20: 240,
  19: 360,
  18: 520,
  17: 760,
  16: 1080,
  15: 1500,
}

const INVALID_BOSS_DAMAGE_MOVES = new Set([DNF, DNS])

export function getDamage(moves: number) {
  if (moves % 100 !== 0) {
    return 0
  }
  if (!INVALID_BOSS_DAMAGE_MOVES.has(moves) && moves >= 2700) {
    return 1
  }
  const moveCount = Math.floor(moves / 100)
  return BOSS_DAMAGE_BY_MOVES[moveCount] ?? 0
}
