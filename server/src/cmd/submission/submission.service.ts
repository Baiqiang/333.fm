import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Algorithm } from 'insertionfinder'
import { IsNull, Not, Repository } from 'typeorm'

import { Submissions } from '@/entities/submissions.entity'
import { removeComment } from '@/utils'

function isMoveLine(line: string): boolean {
  try {
    new Algorithm(line)
    return true
  } catch {
    return false
  }
}

function findFirstMoveParagraph(comment: string): string | null {
  const lines = comment.split('\n')

  let findMoves = false
  const moveLines = []
  for (const line of lines) {
    if (isMoveLine(removeComment(line))) {
      moveLines.push(line)
      findMoves = true
    } else if (findMoves) {
      return moveLines.join('\n')
    }
  }

  return null
}

@Injectable()
export class SubmissionService {
  private readonly logger = new Logger(SubmissionService.name)

  constructor(
    @InjectRepository(Submissions)
    private readonly submissionsRepository: Repository<Submissions>,
  ) {}

  async analyzeComments(): Promise<void> {
    const submissions = await this.submissionsRepository.find({
      where: { comment: Not('') },
      select: ['id', 'comment'],
    })

    let count = 0
    const examples: { paragraph: string; submission: Submissions }[] = []

    for (const sub of submissions) {
      const para = findFirstMoveParagraph(sub.comment)
      if (para) {
        count++
        if (examples.length < 5) {
          examples.push({ paragraph: para, submission: sub })
        }
      }
    }

    this.logger.log(`Total submissions with non-empty comment: ${submissions.length}`)
    this.logger.log(`Submissions with move paragraph: ${count}`)
    this.logger.log('Examples:')
    for (const ex of examples) {
      this.logger.log(`\n--- Submission #${ex.submission.id} ---\n${ex.paragraph}\n${ex.submission.comment}`)
    }
  }
}
