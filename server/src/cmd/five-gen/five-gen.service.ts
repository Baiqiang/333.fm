import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Algorithm } from 'insertionfinder'
import { Repository } from 'typeorm'

import { CompetitionSubType, CompetitionType } from '@/entities/competitions.entity'
import { DNF } from '@/entities/results.entity'
import { SubmissionPhase, Submissions } from '@/entities/submissions.entity'
import { formatSkeleton, removeComment } from '@/utils'
import { submissionLink } from '@/utils/competition-path'

const EXCLUDE_COMPETITION_TYPES = [CompetitionType.FMC_CHAIN]

// Special-scramble practice modes; aligned with center-solved / stats / search.
const EXCLUDE_PRACTICE_SUB_TYPES = [
  CompetitionSubType.EO_PRACTICE,
  CompetitionSubType.DR_PRACTICE,
  CompetitionSubType.HTR_PRACTICE,
  CompetitionSubType.JZP_PRACTICE,
]

const FACE_NAMES = ['U', 'R', 'F', 'D', 'L', 'B']

interface GenEntry {
  submissionId: number
  moves: number
  htm: number
  facesUsed: string
  missingFaces: string
  url: string
}

function getFacesUsed(sequence: string): Set<number> | null {
  try {
    const alg = new Algorithm(removeComment(sequence))
    alg.clearFlags(0)
    const faces = new Set<number>()
    for (const twist of alg.twists) {
      const qt = twist % 4
      if (qt === 0) continue
      faces.add(twist >> 2)
    }
    return faces
  } catch {
    return null
  }
}

function facesUsedLabel(faces: Set<number>): string {
  return FACE_NAMES.filter((_, i) => faces.has(i)).join('')
}

function missingFacesLabel(faces: Set<number>): string | null {
  if (faces.size !== 4 && faces.size !== 5) return null
  const missing = FACE_NAMES.filter((_, i) => !faces.has(i))
  return missing.join('')
}

function toGenEntry(
  submission: Submissions,
  faces: Set<number>,
  baseUrl: string,
): GenEntry {
  return {
    submissionId: submission.id,
    moves: submission.moves,
    htm: submission.moves / 100,
    facesUsed: facesUsedLabel(faces),
    missingFaces: missingFacesLabel(faces)!,
    url: submissionLink(submission.competition, submission.scramble, submission, baseUrl),
  }
}

@Injectable()
export class FiveGenCommandService {
  private readonly logger = new Logger(FiveGenCommandService.name)

  constructor(
    @InjectRepository(Submissions)
    private readonly submissionsRepository: Repository<Submissions>,
  ) {}

  async analyze(baseUrl = process.env.BASE_URL || 'https://333.fm'): Promise<void> {
    const submissions = await this.submissionsRepository
      .createQueryBuilder('s')
      .innerJoinAndSelect('s.scramble', 'sc')
      .innerJoinAndSelect('s.competition', 'c')
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
    let notSolved = 0
    let fiveGen = 0
    let fourGen = 0
    const missingFaceCounts = Object.fromEntries(FACE_NAMES.map(face => [face, 0])) as Record<string, number>
    const faceCountHistogram = Object.fromEntries([4, 5, 6].map(n => [n, 0])) as Record<number, number>
    const fiveGenEntries: GenEntry[] = []
    const fourGenEntries: GenEntry[] = []

    for (const submission of submissions) {
      let formattedSolution: string
      try {
        const { formattedSkeleton, bestCube } = formatSkeleton(submission.scramble.scramble, submission.solution)
        if (!bestCube.isSolved()) {
          notSolved++
          continue
        }
        formattedSolution = formattedSkeleton
      } catch {
        parseFailed++
        continue
      }

      const faces = getFacesUsed(formattedSolution)
      if (!faces) {
        parseFailed++
        continue
      }

      if (faces.size >= 4 && faces.size <= 6) {
        faceCountHistogram[faces.size] = (faceCountHistogram[faces.size] ?? 0) + 1
      }

      if (faces.size === 4) {
        fourGen++
        fourGenEntries.push(toGenEntry(submission, faces, baseUrl))
        continue
      }

      const missingFaces = missingFacesLabel(faces)
      if (!missingFaces) continue

      fiveGen++
      missingFaceCounts[missingFaces] = (missingFaceCounts[missingFaces] ?? 0) + 1
      fiveGenEntries.push(toGenEntry(submission, faces, baseUrl))
    }

    fiveGenEntries.sort((a, b) => a.moves - b.moves || a.submissionId - b.submissionId)
    fourGenEntries.sort((a, b) => a.moves - b.moves || a.submissionId - b.submissionId)
    const top20 = fiveGenEntries.slice(0, 20)
    const valid = total - parseFailed - notSolved

    this.logger.log('=== 5gen submission stats ===')
    this.logger.log(
      `Excluded subTypes:              ${EXCLUDE_PRACTICE_SUB_TYPES.map(t => CompetitionSubType[t]).join(', ')}`,
    )
    this.logger.log(`Total complete submissions:     ${total}`)
    this.logger.log(`Parse failed:                   ${parseFailed}`)
    this.logger.log(`Formatted but not solved:       ${notSolved}`)
    this.logger.log(`4gen (exactly 4 faces used):    ${fourGen}`)
    this.logger.log(`5gen (exactly 5 faces used):    ${fiveGen}`)
    this.logger.log(`Percentage:                     ${total > 0 ? ((fiveGen / total) * 100).toFixed(2) : '0.00'}%`)
    this.logger.log(`Valid parse rate:               ${valid} / ${total}`)
    this.logger.log(
      `Among valid parses:             ${fiveGen} / ${valid} (${valid > 0 ? ((fiveGen / valid) * 100).toFixed(2) : '0.00'}%)`,
    )
    this.logger.log('')
    this.logger.log('=== Face count histogram (4-6 faces) ===')
    for (const count of [4, 5, 6]) {
      const n = faceCountHistogram[count] ?? 0
      this.logger.log(`${count} faces: ${n} (${valid > 0 ? ((n / valid) * 100).toFixed(2) : '0.00'}%)`)
    }
    this.logger.log('')
    this.logger.log('=== Missing face breakdown (5gen only) ===')
    for (const face of FACE_NAMES) {
      const n = missingFaceCounts[face]
      this.logger.log(`Missing ${face}: ${n}${fiveGen > 0 ? ` (${((n / fiveGen) * 100).toFixed(2)}%)` : ''}`)
    }
    this.logger.log('')
    this.logger.log(`=== All ${fourGen} 4gen submissions ===`)
    for (const [i, entry] of fourGenEntries.entries()) {
      this.logger.log(
        [
          `${(i + 1).toString().padStart(2)}.`,
          `#${entry.submissionId}`,
          `${entry.htm} HTM`.padStart(8),
          entry.facesUsed.padEnd(6),
          `no ${entry.missingFaces}`.padEnd(8),
          entry.url,
        ].join('  '),
      )
    }
    this.logger.log('')
    this.logger.log('=== Top 20 shortest 5gen submissions ===')
    for (const [i, entry] of top20.entries()) {
      this.logger.log(
        [
          `${(i + 1).toString().padStart(2)}.`,
          `#${entry.submissionId}`,
          `${entry.htm} HTM`.padStart(8),
          `no ${entry.missingFaces}`.padStart(6),
          entry.url,
        ].join('  '),
      )
    }
  }
}
