import { Process, Processor } from '@nestjs/bull'
import { forwardRef, Inject, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectRepository } from '@nestjs/typeorm'
import { Job } from 'bull'
import { LessThanOrEqual, Repository } from 'typeorm'

import {
  Challenges,
  defaultChallenge,
  getDamage,
  getRandomBossHitPoints,
  matchesChallengeLevel,
} from '@/entities/challenges.entity'
import { Competitions, CompetitionSubType } from '@/entities/competitions.entity'
import { EndlessKickoffs } from '@/entities/endless-kickoffs.entity'
import { Scrambles } from '@/entities/scrambles.entity'
import { Submissions } from '@/entities/submissions.entity'
import { generateScramble, ScrambleType } from '@/utils/scramble'

import { EndlessJob, EndlessService } from '../endless.service'

@Processor('endless')
export class EndlessProcessor {
  private readonly logger = new Logger(EndlessProcessor.name)
  constructor(
    @InjectRepository(Competitions)
    private readonly competitionsRepository: Repository<Competitions>,
    @InjectRepository(Submissions)
    private readonly submissionsRepository: Repository<Submissions>,
    @InjectRepository(Scrambles)
    private readonly scramblesRepository: Repository<Scrambles>,
    @InjectRepository(EndlessKickoffs)
    private readonly kickoffsRepository: Repository<EndlessKickoffs>,
    private readonly configService: ConfigService,
    @Inject(forwardRef(() => EndlessService))
    private readonly endlessService: EndlessService,
  ) {}

  @Process()
  async process(job: Job<EndlessJob>) {
    const {
      competitionId,
      userId,
      scrambleId,
      scrambleNumber,
      submissionId,
      moves,
      previousLevelDnfPenalty,
      solution,
    } = job.data
    const competition = await this.competitionsRepository.findOne({
      where: {
        id: competitionId,
      },
      relations: {
        challenges: true,
      },
    })
    if (competition === null) {
      return
    }
    if (competition.hasEnded) {
      return
    }
    if (competition.subType === CompetitionSubType.MYSTERY) {
      await this.endlessService.evaluateConditions(
        competitionId,
        userId,
        scrambleId,
        scrambleNumber,
        submissionId,
        moves,
        solution ?? '',
      )
      return
    }
    let scrambleType: ScrambleType = ScrambleType.NORMAL
    switch (competition.subType) {
      case CompetitionSubType.EO_PRACTICE:
        scrambleType = ScrambleType.EO
        break
      case CompetitionSubType.DR_PRACTICE:
        scrambleType = ScrambleType.DR
        break
      case CompetitionSubType.HTR_PRACTICE:
        scrambleType = ScrambleType.HTR
        break
      case CompetitionSubType.JZP_PRACTICE:
        scrambleType = ScrambleType.JZP
        break
    }
    const next = await this.scramblesRepository.findOne({
      where: {
        competitionId,
        number: scrambleNumber + 1,
      },
    })
    // if next scramble exists, nothing to do
    if (next !== null) {
      return
    }
    const challenge = this.getChallenge(scrambleNumber, competition.challenges)
    if (!challenge) {
      return
    }
    let generateNext = false
    let singleKickedOff = false
    let goodSubmissions: Submissions[] = []
    if (challenge.isRegular) {
      const { single, team } = challenge.regularChallenge
      // if the result is greater than team required, do nothing
      if (moves > team[0]) {
        return
      }
      if (moves <= single) {
        generateNext = true
        singleKickedOff = true
      } else {
        goodSubmissions = await this.submissionsRepository.find({
          where: {
            scrambleId,
            moves: LessThanOrEqual(team[0]),
          },
        })
        if (goodSubmissions.length >= team[1]) {
          generateNext = true
        }
      }
      if (!generateNext) {
        return
      }
    } else if (challenge.isBoss) {
      const { instantKill } = challenge.bossChallenge
      if (!previousLevelDnfPenalty && moves <= instantKill) {
        const scramble = await this.scramblesRepository.findOneBy({
          id: scrambleId,
        })
        const submission = await this.submissionsRepository.findOneBy({
          id: submissionId,
        })
        if (scramble) {
          scramble.currentHP = 0
          await this.scramblesRepository.save(scramble)
        }
        if (submission) {
          submission.bossInstantKill = true
          await this.submissionsRepository.save(submission)
        }
        generateNext = true
        singleKickedOff = true
      } else {
        let damage = getDamage(moves)
        if (previousLevelDnfPenalty) {
          damage = Math.floor(damage / 2)
        }
        if (damage > 0) {
          const scramble = await this.scramblesRepository.findOneBy({
            id: scrambleId,
          })
          const submission = await this.submissionsRepository.findOneBy({
            id: submissionId,
          })
          this.logger.log(
            `Level ${scramble.number} has ${scramble.currentHP} HP, submission ${submission.id} (${moves}) makes ${damage} damage`,
          )
          scramble.currentHP -= damage
          if (scramble.currentHP <= 0) {
            scramble.currentHP = 0
          }
          submission.damage = damage
          await this.scramblesRepository.save(scramble)
          await this.submissionsRepository.save(submission)
          if (scramble.currentHP <= 0) {
            generateNext = true
            goodSubmissions = await this.submissionsRepository.find({
              where: {
                scrambleId,
              },
            })
          }
        }
      }
    }
    if (!generateNext) {
      return
    }
    const nextChallenge = this.getChallenge(scrambleNumber + 1, competition.challenges)
    if (!nextChallenge) {
      return
    }
    const scramble = new Scrambles()
    scramble.competitionId = competitionId
    scramble.number = scrambleNumber + 1
    scramble.scramble = generateScramble(scrambleType)
    if (nextChallenge.isBoss) {
      scramble.initialHP = getRandomBossHitPoints(nextChallenge.bossChallenge)
      scramble.currentHP = scramble.initialHP
    }
    await this.scramblesRepository.save(scramble)
    this.logger.log(`Generated scramble ${scramble.id} kicked off ${singleKickedOff} user ${userId}`)
    // set kickoff
    const kickoffs: EndlessKickoffs[] = []
    if (singleKickedOff) {
      const kickoff = new EndlessKickoffs()
      kickoff.competitionId = competitionId
      kickoff.userId = userId
      kickoff.scrambleId = scrambleId
      kickoff.submissionId = submissionId
      kickoffs.push(kickoff)
    } else {
      for (const submission of goodSubmissions) {
        const kickoff = new EndlessKickoffs()
        kickoff.competitionId = competitionId
        kickoff.userId = submission.userId
        kickoff.scrambleId = scrambleId
        kickoff.submissionId = submission.id
        kickoffs.push(kickoff)
      }
    }
    await this.kickoffsRepository.save(kickoffs)
  }

  getChallenge(level: number, challenges: Challenges[]): Challenges | undefined {
    if (challenges.length === 0) {
      return defaultChallenge
    }
    return challenges.find(challenge => matchesChallengeLevel(challenge, level))
  }
}
