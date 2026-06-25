import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Algorithm } from 'insertionfinder'
import { Repository } from 'typeorm'

import { CompetitionSubType, CompetitionType } from '@/entities/competitions.entity'
import { DNF } from '@/entities/results.entity'
import { SubmissionPhase, Submissions } from '@/entities/submissions.entity'
import { removeComment } from '@/utils'
import { submissionLink } from '@/utils/competition-path'

const EXCLUDE_PRACTICE_SUB_TYPES = [
  CompetitionSubType.EO_PRACTICE,
  CompetitionSubType.DR_PRACTICE,
  CompetitionSubType.JZP_PRACTICE,
  CompetitionSubType.HTR_PRACTICE,
]

const EXCLUDE_COMPETITION_TYPES = [CompetitionType.FMC_CHAIN]

interface CenterSolvedEntry {
  submissionId: number
  moves: number
  htm: number
  url: string
  competitionType: CompetitionType
}

function getFaceTurnCounts(sequence: string): number[] | null {
  try {
    const alg = new Algorithm(removeComment(sequence))
    alg.clearFlags(0)
    const counts = [0, 0, 0, 0, 0, 0]
    for (const twist of alg.twists) {
      // twist encoding: face = twist >> 2 (U=0..B=5), quarter turn = twist % 4
      const face = twist >> 2
      const qt = twist % 4
      if (qt === 0) continue
      counts[face] = (counts[face] + qt) % 4
    }
    return counts
  } catch {
    return null
  }
}

function centersRestored(counts: number[]): boolean {
  return counts.every(c => c === 0)
}

@Injectable()
export class CenterSolvedCommandService {
  private readonly logger = new Logger(CenterSolvedCommandService.name)

  constructor(
    @InjectRepository(Submissions)
    private readonly submissionsRepository: Repository<Submissions>,
  ) {}

  async analyze(baseUrl = process.env.BASE_URL || 'https://333.fm'): Promise<void> {
    const submissions = await this.submissionsRepository
      .createQueryBuilder('s')
      .innerJoinAndSelect('s.scramble', 'sc')
      .innerJoinAndSelect('s.competition', 'c')
      .leftJoinAndSelect('c.user', 'cUser')
      .innerJoinAndSelect('s.user', 'u')
      .where("s.solution != ''")
      .andWhere("sc.scramble != ''")
      .andWhere('s.phase = :phase', { phase: SubmissionPhase.FINISHED })
      .andWhere('s.moves > 0')
      .andWhere('s.moves < :maxMoves', { maxMoves: DNF })
      .andWhere('c.type NOT IN (:...excludeTypes)', { excludeTypes: EXCLUDE_COMPETITION_TYPES })
      .andWhere('c.subType NOT IN (:...practiceSubTypes)', { practiceSubTypes: EXCLUDE_PRACTICE_SUB_TYPES })
      .getMany()

    const total = submissions.length
    let parseFailed = 0
    let centerSolved = 0
    const centerSolvedEntries: CenterSolvedEntry[] = []

    for (const submission of submissions) {
      const sequence = `${submission.scramble.scramble} ${submission.solution}`.trim()
      const faceCounts = getFaceTurnCounts(sequence)
      if (!faceCounts) {
        parseFailed++
        continue
      }
      if (!centersRestored(faceCounts)) continue

      centerSolved++
      centerSolvedEntries.push({
        submissionId: submission.id,
        moves: submission.moves,
        htm: submission.moves / 100,
        url: submissionLink(submission.competition, submission.scramble, submission, baseUrl),
        competitionType: submission.competition.type,
      })
    }

    centerSolvedEntries.sort((a, b) => a.moves - b.moves || a.submissionId - b.submissionId)
    const top20 = centerSolvedEntries
      .filter(entry => entry.competitionType !== CompetitionType.ENDLESS)
      .slice(0, 20)
    const valid = total - parseFailed

    this.logger.log('=== Center-restored submission stats ===')
    this.logger.log(`Total complete submissions:     ${total}`)
    this.logger.log(`Parse failed:                   ${parseFailed}`)
    this.logger.log(`Centers restored (mod 4 = 0):   ${centerSolved}`)
    this.logger.log(
      `Percentage:                     ${total > 0 ? ((centerSolved / total) * 100).toFixed(2) : '0.00'}%`,
    )
    this.logger.log(`Valid parse rate:               ${valid} / ${total}`)
    this.logger.log(
      `Among valid parses:             ${centerSolved} / ${valid} (${valid > 0 ? ((centerSolved / valid) * 100).toFixed(2) : '0.00'}%)`,
    )
    this.logger.log('')
    this.logger.log('=== Top 20 shortest (by solution HTM, excluding endless) ===')
    for (const [i, entry] of top20.entries()) {
      this.logger.log(
        [
          `${(i + 1).toString().padStart(2)}.`,
          `#${entry.submissionId}`,
          `${entry.htm} HTM`.padStart(8),
          entry.url,
        ].join('  '),
      )
    }
  }
}
