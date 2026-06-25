import { BadRequestException, Injectable, Logger } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'
import { InjectRepository } from '@nestjs/typeorm'
import { Algorithm, Cube } from 'insertionfinder'
import { Repository } from 'typeorm'

import { DailyQuizSubmissions } from '@/entities/daily-quiz-submissions.entity'
import { DailyQuizzes, QuestionType, type QuizOption, type QuizQuestion } from '@/entities/daily-quizzes.entity'
import { QuizQuestionBank } from '@/entities/quiz-question-bank.entity'
import { Users } from '@/entities/users.entity'
import { compToday } from '@/utils'
import { generateScramble, ScrambleType } from '@/utils/scramble'
import {
  type DRAxis,
  getDRQT,
  isHTRState,
  isLeaveSliceState,
  parseScramble,
  solveHTR,
  solveLeaveSlice,
  type StepSolutions,
} from '@/utils/thistlethwaite'

const QUIZ_DURATION = 30 * 60 * 1000
const QUESTION_COUNT = 10

const FACE_MOVES = ['R', 'L', 'F', 'B', 'U', 'D']
const DR_MOVE_POOL = ['U', "U'", 'U2', 'D', "D'", 'D2', 'R2', 'L2', 'F2', 'B2']
const HTR_MOVE_POOL = ['U2', 'D2', 'R2', 'L2', 'F2', 'B2']

const ALL_QUESTION_TYPES = [
  QuestionType.DR_BEST_HTR,
  QuestionType.DR_VALID_HTR,
  QuestionType.DR_QT_STEP,
  QuestionType.HTR_BEST_LEAVE_SLICE,
]

const OPTION_LABELS = ['A', 'B', 'C', 'D']

function invertMove(move: string): string {
  if (move.endsWith("'")) return move.slice(0, -1)
  if (move.endsWith('2')) return move
  return move + "'"
}

function movePower(move: string): number {
  if (move.endsWith("'")) return 3
  if (move.endsWith('2')) return 2
  return 1
}

function buildMove(face: string, power: number): string | null {
  const p = ((power % 4) + 4) % 4
  if (p === 0) return null
  if (p === 1) return face
  if (p === 2) return face + '2'
  return face + "'"
}

function simplifyMoves(moves: string[]): void {
  let i = 0
  while (i < moves.length - 1) {
    if (moves[i][0] !== moves[i + 1][0]) {
      i++
      continue
    }
    const face = moves[i][0]
    const merged = buildMove(face, movePower(moves[i]) + movePower(moves[i + 1]))
    if (merged) {
      moves.splice(i, 2, merged)
    } else {
      moves.splice(i, 2)
    }
    if (i > 0) i--
  }
}

function formatNissDisplay(solution: string): string {
  const tokens = solution.split(/\s+/).filter(Boolean)
  if (!tokens.includes('@')) return solution
  const segments: string[][] = [[]]
  for (const t of tokens) {
    if (t === '@') segments.push([])
    else segments[segments.length - 1].push(t)
  }
  const result: string[] = []
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i]
    if (seg.length === 0) continue
    if (i % 2 === 0 && segments.length > 1) {
      result.push(`(${[...seg].reverse().map(invertMove).join(' ')})`)
    } else {
      result.push(seg.join(' '))
    }
  }
  return result.join(' ')
}

function getOptimalSolutions(results: StepSolutions[]): string[] {
  let minLen = Infinity
  for (const r of results) {
    if (r.solutions.length > 0 && r.effectiveLength < minLen) minLen = r.effectiveLength
  }
  const solutions: string[] = []
  for (const r of results) {
    if (r.effectiveLength === minLen) solutions.push(...r.solutions)
  }
  return solutions
}

function getAllSolutions(results: StepSolutions[]): string[] {
  const solutions: string[] = []
  for (const r of results) {
    solutions.push(...r.solutions)
  }
  return solutions
}

function getNonOptimalSolutions(results: StepSolutions[]): string[] {
  let minLen = Infinity
  for (const r of results) {
    if (r.solutions.length > 0 && r.effectiveLength < minLen) minLen = r.effectiveLength
  }
  const solutions: string[] = []
  for (const r of results) {
    if (r.effectiveLength > minLen) solutions.push(...r.solutions)
  }
  return solutions
}

function displayToFullSequence(display: string, scramble: string): string {
  const tokens = display.split(/\s+/).filter(Boolean)
  const preMoves: string[] = []
  const normalMoves: string[] = []
  let parenGroup: string[] = []
  let inParen = false

  for (const token of tokens) {
    const startsP = token.startsWith('(')
    const endsP = token.endsWith(')')
    const clean = token.replace(/[()]/g, '')

    if (startsP && endsP) {
      preMoves.push(invertMove(clean))
    } else if (startsP) {
      inParen = true
      if (clean) parenGroup.push(clean)
    } else if (endsP) {
      if (clean) parenGroup.push(clean)
      preMoves.push(...[...parenGroup].reverse().map(invertMove))
      parenGroup = []
      inParen = false
    } else if (inParen) {
      if (clean) parenGroup.push(clean)
    } else {
      normalMoves.push(clean)
    }
  }

  return [...preMoves, scramble, ...normalMoves].filter(Boolean).join(' ')
}

function countDisplayMoves(display: string): number {
  return display.split(/\s+/).filter(Boolean).length
}

function isValidWrongOption(
  display: string,
  scramble: string,
  type: QuestionType,
  optimalMoveCount: number,
  drAxis?: string,
): boolean {
  const fullSeq = displayToFullSequence(display, scramble)

  if (type === QuestionType.HTR_BEST_LEAVE_SLICE) {
    const perm = parseScramble(fullSeq)
    if (!isLeaveSliceState(perm, drAxis as DRAxis)) return true
    return countDisplayMoves(display) > optimalMoveCount
  }

  if (!isHTRState(fullSeq)) return true

  if (type === QuestionType.DR_VALID_HTR) return false

  return countDisplayMoves(display) > optimalMoveCount
}

function getOppositeMove(move: string): string {
  const opposites: Record<string, string> = { R: 'L', L: 'R', F: 'B', B: 'F', U: 'D', D: 'U' }
  return (opposites[move[0]] || move[0]) + move.slice(1)
}

function isHTMove(token: string): boolean {
  return token.replace(/[()]/g, '').endsWith('2')
}

function moveFace(token: string): string {
  return token.replace(/[()]/g, '')[0]
}

function sameAxis(face1: string, face2: string): boolean {
  const axes: Record<string, number> = { R: 0, L: 0, F: 1, B: 1, U: 2, D: 2 }
  return axes[face1] === axes[face2]
}

interface DisplaySegment {
  moves: string[]
  isInverse: boolean
}

function parseSegments(tokens: string[]): DisplaySegment[] {
  const segments: DisplaySegment[] = []
  let current: DisplaySegment | null = null
  let inParen = false

  for (const token of tokens) {
    const pure = token.replace(/[()]/g, '')
    const startsP = token.startsWith('(')
    const endsP = token.endsWith(')')

    if (startsP && endsP) {
      if (current && current.moves.length > 0) segments.push(current)
      segments.push({ moves: [pure], isInverse: true })
      current = null
    } else if (startsP) {
      if (current && current.moves.length > 0) segments.push(current)
      inParen = true
      current = { moves: [pure], isInverse: true }
    } else if (endsP) {
      if (!current) current = { moves: [], isInverse: true }
      current.moves.push(pure)
      segments.push(current)
      current = null
      inParen = false
    } else {
      if (!current || current.isInverse !== inParen) {
        if (current && current.moves.length > 0) segments.push(current)
        current = { moves: [], isInverse: inParen }
      }
      current.moves.push(pure)
    }
  }
  if (current && current.moves.length > 0) segments.push(current)

  return segments
}

function segmentsToDisplay(segments: DisplaySegment[]): string {
  const parts: string[] = []
  for (const seg of segments) {
    if (seg.moves.length === 0) continue
    if (seg.isInverse) {
      if (seg.moves.length === 1) {
        parts.push(`(${seg.moves[0]})`)
      } else {
        parts.push(`(${seg.moves[0]}`)
        for (let i = 1; i < seg.moves.length - 1; i++) parts.push(seg.moves[i])
        parts.push(`${seg.moves[seg.moves.length - 1]})`)
      }
    } else {
      parts.push(...seg.moves)
    }
  }
  return parts.join(' ')
}

function addHTStepToSegments(segments: DisplaySegment[], movePool: string[], isDRType: boolean): string {
  const htMoves = movePool.filter(m => m.endsWith('2'))
  if (htMoves.length === 0 || segments.length === 0) return segmentsToDisplay(segments)

  const lastNormalSegIdx = segments.reduce((last, seg, i) => (!seg.isInverse ? i : last), -1)

  for (let attempt = 0; attempt < 50; attempt++) {
    const si = Math.floor(Math.random() * segments.length)
    const seg = segments[si]
    if (seg.moves.length === 0) continue

    const newMove = htMoves[Math.floor(Math.random() * htMoves.length)]
    const newFace = moveFace(newMove)
    const maxPos = isDRType && si === lastNormalSegIdx && !seg.isInverse ? seg.moves.length : seg.moves.length + 1
    const idx = Math.floor(Math.random() * maxPos)

    const prevMove = idx > 0 ? seg.moves[idx - 1] : null
    const nextMove = idx < seg.moves.length ? seg.moves[idx] : null

    let valid = true
    if (prevMove) {
      const pf = moveFace(prevMove)
      if (newFace === pf) valid = false
      if (newFace !== pf && sameAxis(newFace, pf) && !isHTMove(prevMove)) valid = false
    }
    if (nextMove && valid) {
      const nf = moveFace(nextMove)
      if (newFace === nf) valid = false
      if (newFace !== nf && sameAxis(newFace, nf) && !isHTMove(nextMove)) valid = false
    }
    if (!valid) continue

    seg.moves.splice(idx, 0, newMove)
    return segmentsToDisplay(segments)
  }

  segments[0].moves.splice(0, 0, htMoves[Math.floor(Math.random() * htMoves.length)])
  return segmentsToDisplay(segments)
}

function modifySolution(display: string, movePool: string[], isDRType: boolean): string {
  const tokens = display.split(/\s+/).filter(Boolean)
  if (tokens.length === 0) return movePool[Math.floor(Math.random() * movePool.length)]

  const segments = parseSegments(tokens)
  const totalMoves = segments.reduce((sum, s) => sum + s.moves.length, 0)

  const actions: number[] = [0, 2]
  if (totalMoves > 1) actions.push(1)
  const action = actions[Math.floor(Math.random() * actions.length)]

  if (action === 0) {
    const subAction = Math.random() < 0.5 ? 'opposite' : 'invertQT'
    const candidates: [number, number][] = []
    for (let si = 0; si < segments.length; si++) {
      for (let mi = 0; mi < segments[si].moves.length; mi++) {
        candidates.push([si, mi])
      }
    }
    candidates.sort(() => Math.random() - 0.5)

    if (subAction === 'invertQT') {
      for (const [si, mi] of candidates) {
        const seg = segments[si]
        if (mi === seg.moves.length - 1) continue
        const move = seg.moves[mi]
        if (isHTMove(move)) continue
        const inverted = invertMove(move)
        if (inverted === move) continue
        seg.moves[mi] = inverted
        return segmentsToDisplay(segments)
      }
    }

    for (const [si, mi] of candidates) {
      const seg = segments[si]
      const move = seg.moves[mi]
      const opposite = getOppositeMove(move)
      const prev = mi > 0 ? seg.moves[mi - 1] : null
      const next = mi < seg.moves.length - 1 ? seg.moves[mi + 1] : null
      if (prev && moveFace(prev) === moveFace(opposite)) continue
      if (next && moveFace(next) === moveFace(opposite)) continue
      seg.moves[mi] = opposite
      return segmentsToDisplay(segments)
    }
    return addHTStepToSegments(segments, movePool, isDRType)
  }

  if (action === 1) {
    const removable: [number, number][] = []
    for (let si = 0; si < segments.length; si++) {
      const seg = segments[si]
      for (let mi = 0; mi < seg.moves.length; mi++) {
        if (!isHTMove(seg.moves[mi])) continue
        if (mi === 0) {
          removable.push([si, mi])
        } else {
          const prev = seg.moves[mi - 1]
          const next = mi < seg.moves.length - 1 ? seg.moves[mi + 1] : null
          if (isHTMove(prev) || (next && isHTMove(next))) {
            removable.push([si, mi])
          }
        }
      }
    }
    if (removable.length > 0) {
      const [si, mi] = removable[Math.floor(Math.random() * removable.length)]
      segments[si].moves.splice(mi, 1)
      simplifyMoves(segments[si].moves)
      if (segments[si].moves.length === 0) segments.splice(si, 1)
      return segmentsToDisplay(segments)
    }
    return addHTStepToSegments(segments, movePool, isDRType)
  }

  return addHTStepToSegments(segments, movePool, isDRType)
}

@Injectable()
export class QuizService {
  private readonly logger = new Logger(QuizService.name)

  constructor(
    @InjectRepository(DailyQuizzes)
    private readonly quizzesRepository: Repository<DailyQuizzes>,
    @InjectRepository(DailyQuizSubmissions)
    private readonly submissionsRepository: Repository<DailyQuizSubmissions>,
    @InjectRepository(QuizQuestionBank)
    private readonly bankRepository: Repository<QuizQuestionBank>,
  ) {
    this.refillQuestionBank()
  }

  @Cron('0 0 * * *')
  async generateDailyQuiz() {
    const today = compToday()
    const existing = await this.quizzesRepository.findOne({ where: { day: today } })
    if (existing) return existing

    return this.createQuiz(today)
  }

  @Cron('55 23 * * *')
  async refillQuestionBank() {
    this.logger.log('Refilling question bank...')
    const target = QUESTION_COUNT * 2

    for (const allC of [false, true]) {
      const available = await this.bankRepository.count({ where: { used: false, allC } })
      const needed = target - available
      if (needed <= 0) {
        this.logger.log(`Bank for allC=${allC}: ${available} available, no refill needed`)
        continue
      }

      this.logger.log(`Bank for allC=${allC}: ${available} available, generating ${needed} more`)
      let generated = 0
      for (let i = 0; i < needed; i++) {
        const negative = Math.random() < 0.35
        const type = ALL_QUESTION_TYPES[Math.floor(Math.random() * ALL_QUESTION_TYPES.length)]
        try {
          const question = this.generateQuestion(type, negative, allC)
          const entry = new QuizQuestionBank()
          entry.type = type
          entry.negative = negative
          entry.allC = allC
          entry.question = question
          await this.bankRepository.save(entry)
          generated++
        } catch (e) {
          this.logger.warn(`Failed to generate bank question: ${e}`)
        }
      }
      this.logger.log(`Generated ${generated}/${needed} questions for allC=${allC}`)
    }
  }

  async createQuiz(day: string) {
    const allC = Math.random() < 0.1
    const questions: QuizQuestion[] = []

    const bankQuestions = await this.bankRepository.find({
      where: { used: false, allC },
      order: { createdAt: 'ASC' },
      take: QUESTION_COUNT,
    })

    for (const entry of bankQuestions) {
      questions.push(entry.question)
      entry.used = true
    }
    if (bankQuestions.length > 0) {
      await this.bankRepository.save(bankQuestions)
    }

    const remaining = QUESTION_COUNT - questions.length
    if (remaining > 0) {
      this.logger.warn(`Bank short by ${remaining} questions (allC=${allC}), generating on-the-fly`)
      for (let i = 0; i < remaining; i++) {
        const negative = Math.random() < 0.35
        const type = ALL_QUESTION_TYPES[Math.floor(Math.random() * ALL_QUESTION_TYPES.length)]
        questions.push(this.generateQuestion(type, negative, allC))
      }
    }

    const quiz = new DailyQuizzes()
    quiz.day = day
    quiz.questions = questions
    quiz.allC = allC
    return this.quizzesRepository.save(quiz)
  }

  async getTodayQuiz() {
    const today = compToday()
    let quiz = await this.quizzesRepository.findOne({ where: { day: today } })
    if (!quiz) {
      quiz = await this.createQuiz(today)
    }
    return quiz
  }

  async getQuizByDay(day: string) {
    return this.quizzesRepository.findOne({ where: { day } })
  }

  async getQuizForUser(quizId: number, user: Users | null) {
    const quiz = await this.quizzesRepository.findOne({ where: { id: quizId } })
    if (!quiz) throw new BadRequestException('Quiz not found')

    const today = compToday()
    const isToday = quiz.day === today

    let submission: DailyQuizSubmissions | null = null
    if (user) {
      submission = await this.submissionsRepository.findOne({
        where: { quizId, userId: user.id },
      })
    }

    if (
      submission &&
      !submission.finished &&
      submission.startedAt &&
      Date.now() - Number(submission.startedAt) >= QUIZ_DURATION
    ) {
      await this.finalizeExpiredSubmission(submission, quiz)
    }

    const isFinished = submission?.finished ?? false
    const now = Date.now()
    const revealAnswers = isFinished || !isToday

    const questions = quiz.questions.map((q, idx) => ({
      index: idx,
      type: q.type,
      negative: q.negative,
      scramble: q.scramble,
      drAxis: q.drAxis,
      lastMove: q.lastMove,
      options: q.options.map((o, oi) => ({
        index: oi,
        label: o.label,
        solution: o.solution,
        correct: revealAnswers ? o.correct : undefined,
      })),
    }))

    return {
      quiz: {
        id: quiz.id,
        day: quiz.day,
        questionCount: quiz.questions.length,
        isToday,
      },
      questions: submission?.startedAt || !isToday ? questions : undefined,
      submission: submission
        ? {
            id: submission.id,
            started: !!submission.startedAt,
            finished: submission.finished,
            answers: submission.answers,
            correctCount: isFinished ? submission.correctCount : undefined,
            totalQuestions: submission.totalQuestions,
            remainingTime: isFinished
              ? Number(submission.remainingTime)
              : submission.startedAt
                ? Math.max(0, QUIZ_DURATION - (now - Number(submission.startedAt)))
                : QUIZ_DURATION,
            startedAt: submission.startedAt ? Number(submission.startedAt) : null,
          }
        : null,
    }
  }

  async startQuiz(user: Users, quizId: number) {
    const quiz = await this.quizzesRepository.findOne({ where: { id: quizId } })
    if (!quiz) throw new BadRequestException('Quiz not found')
    if (quiz.day !== compToday()) throw new BadRequestException('Quiz expired')

    let submission = await this.submissionsRepository.findOne({
      where: { quizId, userId: user.id },
    })
    if (submission?.finished) {
      throw new BadRequestException('Already submitted')
    }
    if (submission?.startedAt) {
      if (Date.now() - Number(submission.startedAt) >= QUIZ_DURATION) {
        await this.finalizeExpiredSubmission(submission, quiz)
        throw new BadRequestException('Time expired')
      }
      return this.getQuizForUser(quizId, user)
    }

    if (!submission) {
      submission = new DailyQuizSubmissions()
      submission.quizId = quizId
      submission.userId = user.id
      submission.answers = Array.from({ length: quiz.questions.length }, () => [])
      submission.totalQuestions = quiz.questions.length
    }
    submission.startedAt = Date.now()
    await this.submissionsRepository.save(submission)

    return this.getQuizForUser(quizId, user)
  }

  async submitQuiz(user: Users, quizId: number, answers: number[][]) {
    const quiz = await this.quizzesRepository.findOne({ where: { id: quizId } })
    if (!quiz) throw new BadRequestException('Quiz not found')
    if (quiz.day !== compToday()) throw new BadRequestException('Quiz expired')

    const submission = await this.submissionsRepository.findOne({
      where: { quizId, userId: user.id },
    })
    if (!submission) throw new BadRequestException('Quiz not started')
    if (submission.finished) throw new BadRequestException('Already submitted')
    if (!submission.startedAt) throw new BadRequestException('Quiz not started')

    submission.answers = answers
    const remaining = Math.max(0, QUIZ_DURATION - (Date.now() - Number(submission.startedAt)))
    submission.correctCount = this.scoreAnswers(quiz, answers)
    submission.totalQuestions = quiz.questions.length
    submission.remainingTime = remaining
    submission.finished = true
    await this.submissionsRepository.save(submission)

    return this.getQuizForUser(quizId, user)
  }

  @Cron('*/5 * * * *')
  async finalizeExpiredSubmissions() {
    const cutoff = Date.now() - QUIZ_DURATION
    const expired = await this.submissionsRepository
      .createQueryBuilder('s')
      .innerJoinAndSelect('s.quiz', 'quiz')
      .where('s.finished = :finished', { finished: false })
      .andWhere('s.startedAt IS NOT NULL')
      .andWhere('s.startedAt <= :cutoff', { cutoff: String(cutoff) })
      .getMany()

    for (const submission of expired) {
      await this.finalizeExpiredSubmission(submission, submission.quiz)
    }
    if (expired.length > 0) {
      this.logger.log(`Auto-finalized ${expired.length} expired submissions`)
    }
  }

  private scoreAnswers(quiz: DailyQuizzes, answers: number[][]): number {
    let correctCount = 0
    for (let i = 0; i < quiz.questions.length; i++) {
      const question = quiz.questions[i]
      const userAnswer = (answers[i] || []).sort()
      const correctAnswer = question.options
        .map((o, idx) => (o.correct ? idx : -1))
        .filter(idx => idx >= 0)
        .sort()
      if (userAnswer.length === correctAnswer.length && userAnswer.every((v, j) => v === correctAnswer[j])) {
        correctCount++
      }
    }
    return correctCount
  }

  private async finalizeExpiredSubmission(submission: DailyQuizSubmissions, quiz: DailyQuizzes) {
    submission.correctCount = this.scoreAnswers(quiz, submission.answers)
    submission.totalQuestions = quiz.questions.length
    submission.remainingTime = 0
    submission.finished = true
    await this.submissionsRepository.save(submission)
  }

  async getSubmissionByDay(day: string, id: string, viewer: Users | null) {
    const quiz = await this.quizzesRepository.findOne({ where: { day } })
    if (!quiz) throw new BadRequestException('Quiz not found')

    const today = compToday()
    const isToday = quiz.day === today

    if (isToday) {
      if (!viewer) throw new BadRequestException('Sign in required')
      const viewerSubmission = await this.submissionsRepository.findOne({
        where: { quizId: quiz.id, userId: viewer.id, finished: true },
      })
      if (!viewerSubmission) {
        throw new BadRequestException('You must finish the quiz before viewing others')
      }
    }

    const qb = this.submissionsRepository.createQueryBuilder('s')
      .leftJoinAndSelect('s.user', 'user')
      .where('s.quizId = :quizId', { quizId: quiz.id })
      .andWhere('s.finished = true')

    if (/^\d+$/.test(id)) {
      qb.andWhere('s.userId = :id', { id: Number(id) })
    }
    else {
      qb.andWhere('user.wcaId = :wcaId', { wcaId: id })
    }

    const targetSubmission = await qb.getOne()
    if (!targetSubmission) {
      throw new BadRequestException('Submission not found')
    }

    const questions = quiz.questions.map((q, idx) => ({
      index: idx,
      type: q.type,
      negative: q.negative,
      scramble: q.scramble,
      drAxis: q.drAxis,
      lastMove: q.lastMove,
      options: q.options.map((o, oi) => ({
        index: oi,
        label: o.label,
        solution: o.solution,
        correct: o.correct,
      })),
    }))

    return {
      quiz: {
        id: quiz.id,
        day: quiz.day,
        questionCount: quiz.questions.length,
        isToday,
      },
      questions,
      user: targetSubmission.user,
      submission: {
        answers: targetSubmission.answers,
        correctCount: targetSubmission.correctCount,
        totalQuestions: targetSubmission.totalQuestions,
        remainingTime: Number(targetSubmission.remainingTime),
      },
    }
  }

  async getLeaderboard(quizId: number) {
    const submissions = await this.submissionsRepository.find({
      where: { quizId, finished: true },
      relations: ['user'],
      order: { correctCount: 'DESC', remainingTime: 'DESC' },
      take: 50,
    })

    return submissions.map((s, i) => ({
      rank: i + 1,
      user: s.user,
      correctCount: s.correctCount,
      totalQuestions: s.totalQuestions,
      remainingTime: Number(s.remainingTime),
    }))
  }

  async getHistory(page = 1, limit = 20) {
    const [quizzes, total] = await this.quizzesRepository.findAndCount({
      order: { day: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    })

    return {
      items: quizzes.map(q => ({
        id: q.id,
        day: q.day,
        questionCount: q.questions.length,
      })),
      total,
      page,
      limit,
    }
  }

  private generateQuestion(type: QuestionType, negative: boolean, allC: boolean): QuizQuestion {
    for (let retry = 0; retry < 10; retry++) {
      const q = this.tryGenerateQuestion(type, negative, allC)
      if (q) return q
    }
    return this.generateFallbackQuestion(type, negative)
  }

  private tryGenerateQuestion(type: QuestionType, negative: boolean, allC: boolean): QuizQuestion | null {
    let scramble: string
    let lastMove: string | undefined
    let drAxis: string | undefined

    switch (type) {
      case QuestionType.DR_BEST_HTR:
      case QuestionType.DR_VALID_HTR:
      case QuestionType.DR_QT_STEP: {
        scramble = generateScramble(ScrambleType.DR)
        const cube = new Cube()
        cube.twist(new Algorithm(scramble))
        const drStatus = cube.getDominoReductionStatus()
        const nonAxisFaces = FACE_MOVES.filter(m => !drStatus[0].includes(m))
        lastMove = nonAxisFaces[Math.floor(Math.random() * nonAxisFaces.length)]
        drAxis = drStatus[0]
        break
      }
      case QuestionType.HTR_BEST_LEAVE_SLICE:
        scramble = generateScramble(ScrambleType.HTR)
        drAxis = ['ud', 'fb', 'rl'][Math.floor(Math.random() * 3)]
        lastMove = drAxis.toUpperCase()[Math.floor(Math.random() * 2)]
        break
      default:
        return null
    }

    if (type === QuestionType.DR_QT_STEP) {
      const qt = getDRQT(scramble)
      if (qt === null || qt === 0) return null

      let options: QuizOption[]
      if (qt >= 3) {
        options = this.buildQTStepOptionsHigh(scramble, drAxis!, qt, negative, allC)
      } else {
        const results = solveHTR(scramble, { lastMove, useNiss: false, maxSolutions: 50 })
        const optimalSolutions = getOptimalSolutions(results)
        if (optimalSolutions.length === 0) return null
        options = this.buildQTStepOptionsLow(scramble, drAxis!, qt, optimalSolutions, negative, allC)
      }

      if (options.length !== 4) return null
      return { type, scramble, drAxis, lastMove, negative, options }
    }

    const isBestType = type === QuestionType.DR_BEST_HTR || type === QuestionType.HTR_BEST_LEAVE_SLICE
    const results =
      type === QuestionType.HTR_BEST_LEAVE_SLICE
        ? solveLeaveSlice(scramble, drAxis as DRAxis, {
            lastMove,
            maxSolutions: 50,
            includeSuboptimal: isBestType ? 2 : undefined,
          })
        : solveHTR(scramble, {
            lastMove,
            useNiss: true,
            maxSolutions: 50,
            includeSuboptimal: isBestType ? 2 : undefined,
          })

    const optimalSolutions = getOptimalSolutions(results)
    if (optimalSolutions.length === 0) return null

    const suboptimalSolutions = isBestType ? getNonOptimalSolutions(results) : []

    if (type === QuestionType.HTR_BEST_LEAVE_SLICE) {
      const allAxes: DRAxis[] = ['ud', 'fb', 'rl']
      for (const otherAxis of allAxes.filter(a => a !== drAxis)) {
        const otherResults = solveLeaveSlice(scramble, otherAxis, { lastMove, maxSolutions: 20 })
        const otherSols = getOptimalSolutions(otherResults)
        suboptimalSolutions.push(...otherSols)
      }
    }

    const movePool = type === QuestionType.HTR_BEST_LEAVE_SLICE ? HTR_MOVE_POOL : DR_MOVE_POOL
    const validSols = type === QuestionType.DR_VALID_HTR ? getAllSolutions(results) : optimalSolutions
    const formatted = [...new Set(validSols.map(formatNissDisplay))]
    const optimalFormatted = [...new Set(optimalSolutions.map(formatNissDisplay))]
    const optimalMoveCount = Math.min(...optimalFormatted.map(countDisplayMoves))
    const options = this.buildSolutionOptions(
      formatted,
      movePool,
      negative,
      allC,
      type !== QuestionType.HTR_BEST_LEAVE_SLICE,
      scramble,
      type,
      optimalMoveCount,
      drAxis,
      isBestType ? suboptimalSolutions : undefined,
    )

    console.log(options)

    if (options.length !== 4) return null
    return { type, scramble, drAxis, lastMove, negative, options }
  }

  private buildSolutionOptions(
    validSolutions: string[],
    movePool: string[],
    negative: boolean,
    allC: boolean,
    isDRType: boolean,
    scramble: string,
    type: QuestionType,
    optimalMoveCount: number,
    drAxis?: string,
    suboptimalSolutions?: string[],
  ): QuizOption[] {
    const shuffled = [...validSolutions].sort(() => Math.random() - 0.5)
    const numValid = allC
      ? negative
        ? Math.min(3, shuffled.length)
        : 1
      : Math.min(Math.floor(Math.random() * 3) + 1, shuffled.length, 3)
    const numInvalid = 4 - numValid

    const validPicks = shuffled.slice(0, numValid)
    const invalidPicks: string[] = []
    const used = new Set(validSolutions)

    if (suboptimalSolutions && suboptimalSolutions.length > 0) {
      const subShuffled = [...suboptimalSolutions].sort(() => Math.random() - 0.5)
      for (const s of subShuffled) {
        if (invalidPicks.length >= numInvalid) break
        const display = formatNissDisplay(s)
        if (used.has(display)) continue
        invalidPicks.push(display)
        used.add(display)
      }
    }

    for (let i = 0; i < 200 && invalidPicks.length < numInvalid; i++) {
      const base = validPicks[Math.floor(Math.random() * validPicks.length)]
      const wrong = modifySolution(base, movePool, isDRType)
      if (used.has(wrong)) continue
      if (!isValidWrongOption(wrong, scramble, type, optimalMoveCount, drAxis)) continue
      invalidPicks.push(wrong)
      used.add(wrong)
    }
    for (let i = 0; i < 200 && invalidPicks.length < numInvalid; i++) {
      const len = Math.floor(Math.random() * 3) + 1
      const s = Array.from({ length: len }, () => movePool[Math.floor(Math.random() * movePool.length)]).join(' ')
      if (!used.has(s)) {
        invalidPicks.push(s)
        used.add(s)
      }
    }

    const raw: QuizOption[] = [
      ...validPicks.map(s => ({ label: '', solution: s, correct: !negative })),
      ...invalidPicks.map(s => ({ label: '', solution: s, correct: negative })),
    ]
    return this.arrangeOptions(raw, allC)
  }

  private getDRAxisQTMoves(drAxis: string): string[] {
    const axis = drAxis.toUpperCase()
    if (axis.includes('U') && axis.includes('D')) return ['U', "U'", 'D', "D'"]
    if (axis.includes('F') && axis.includes('B')) return ['F', "F'", 'B', "B'"]
    if (axis.includes('R') && axis.includes('L')) return ['R', "R'", 'L', "L'"]
    return ['U', "U'", 'D', "D'"]
  }

  private generateRandomDRSequence(drQTMoves: string[]): string {
    const qtFaces = new Set(drQTMoves.map(m => m[0]))
    const htPool = HTR_MOVE_POOL.filter(m => !qtFaces.has(m[0]))
    const htCount = Math.floor(Math.random() * 4) + 1
    const moves: string[] = []
    for (let i = 0; i < htCount; i++) {
      for (let attempt = 0; attempt < 20; attempt++) {
        const m = htPool[Math.floor(Math.random() * htPool.length)]
        const face = m[0]
        const lastFace = moves.length > 0 ? moves[moves.length - 1][0] : ''
        if (face === lastFace) continue
        if (moves.length >= 2 && face === moves[moves.length - 2][0] && sameAxis(lastFace, face)) continue
        moves.push(m)
        break
      }
    }
    const lastFace = moves.length > 0 ? moves[moves.length - 1][0] : ''
    let candidates = drQTMoves.filter(m => m[0] !== lastFace)
    if (candidates.length === 0) candidates = drQTMoves
    moves.push(candidates[Math.floor(Math.random() * candidates.length)])
    return moves.join(' ')
  }

  private buildQTStepOptionsHigh(
    scramble: string,
    drAxis: string,
    qt: number,
    negative: boolean,
    allC: boolean,
  ): QuizOption[] {
    const drQTMoves = this.getDRAxisQTMoves(drAxis)
    const correctOptions: string[] = []
    const wrongOptions: string[] = []
    const used = new Set<string>()

    for (let attempt = 0; attempt < 200; attempt++) {
      if (correctOptions.length >= 3 && wrongOptions.length >= 3) break
      const option = this.generateRandomDRSequence(drQTMoves)
      if (used.has(option)) continue
      used.add(option)

      const newQT = getDRQT(scramble + ' ' + option)
      if (newQT === null || newQT === 0) continue

      if (newQT < qt) {
        if (correctOptions.length < 3) correctOptions.push(option)
      } else {
        if (wrongOptions.length < 3) wrongOptions.push(option)
      }
    }

    if (correctOptions.length === 0 || wrongOptions.length === 0) return []

    let effectiveAllC = allC
    let numCorrect = effectiveAllC
      ? negative
        ? Math.min(3, correctOptions.length)
        : 1
      : Math.min(Math.floor(Math.random() * 3) + 1, correctOptions.length, 3)
    let numWrong = 4 - numCorrect

    if (correctOptions.length < numCorrect || wrongOptions.length < numWrong) {
      if (effectiveAllC) {
        effectiveAllC = false
        numCorrect = Math.min(Math.floor(Math.random() * 3) + 1, correctOptions.length, 3)
        numWrong = 4 - numCorrect
      }
      if (correctOptions.length < numCorrect || wrongOptions.length < numWrong) return []
    }

    const raw: QuizOption[] = [
      ...correctOptions
        .sort(() => Math.random() - 0.5)
        .slice(0, numCorrect)
        .map(s => ({ label: '', solution: s, correct: !negative })),
      ...wrongOptions
        .sort(() => Math.random() - 0.5)
        .slice(0, numWrong)
        .map(s => ({ label: '', solution: s, correct: negative })),
    ]
    return this.arrangeOptions(raw, effectiveAllC)
  }

  private buildQTStepOptionsLow(
    scramble: string,
    drAxis: string,
    qt: number,
    optimalSolutions: string[],
    negative: boolean,
    allC: boolean,
  ): QuizOption[] {
    const drQTMoveSet = new Set(this.getDRAxisQTMoves(drAxis))

    const qtFaces = new Set([...drQTMoveSet].map(m => m[0]))
    const truncated = new Set<string>()
    for (const sol of optimalSolutions) {
      const parts = sol.split(/\s+/).filter(Boolean)

      const qtIndices: number[] = []
      for (let i = 0; i < parts.length; i++) {
        if (drQTMoveSet.has(parts[i])) qtIndices.push(i)
      }
      if (qtIndices.length === 0) continue

      let targetQTIdx = -1
      for (const idx of qtIndices) {
        const newQT = getDRQT(scramble + ' ' + parts.slice(0, idx + 1).join(' '))
        if (newQT !== null && newQT < qt) {
          targetQTIdx = idx
          break
        }
      }
      if (targetQTIdx === -1) continue

      const prefix = parts.slice(0, targetQTIdx + 1)
      const filtered = prefix.filter(p => !(p.endsWith('2') && qtFaces.has(p[0])))
      if (filtered.length > 0) {
        const filteredStr = filtered.join(' ')
        const filteredQT = getDRQT(scramble + ' ' + filteredStr)
        if (filteredQT !== null && filteredQT < qt) {
          truncated.add(filteredStr)
        } else {
          truncated.add(prefix.join(' '))
        }
      }
    }

    if (truncated.size === 0) return []

    const correctArr = [...truncated].sort(() => Math.random() - 0.5)
    let effectiveAllC = allC
    let numCorrect = effectiveAllC
      ? negative
        ? Math.min(3, correctArr.length)
        : 1
      : Math.min(Math.floor(Math.random() * 3) + 1, correctArr.length, 3)
    let numWrong = 4 - numCorrect

    let correctPicks = correctArr.slice(0, numCorrect)
    const usedSet = new Set([...truncated])
    const wrongPicks: string[] = []

    for (let i = 0; i < 200 && wrongPicks.length < numWrong; i++) {
      const base = correctPicks[Math.floor(Math.random() * correctPicks.length)]
      const modified = modifySolution(base, DR_MOVE_POOL, true)
      if (usedSet.has(modified)) continue
      const newQT = getDRQT(scramble + ' ' + modified)
      if (newQT !== null && newQT < qt) continue
      wrongPicks.push(modified)
      usedSet.add(modified)
    }

    if (wrongPicks.length < numWrong && effectiveAllC) {
      effectiveAllC = false
      numCorrect = Math.min(Math.floor(Math.random() * 3) + 1, correctArr.length, 3)
      numWrong = 4 - numCorrect
      correctPicks = correctArr.slice(0, numCorrect)
    }
    if (wrongPicks.length < numWrong) return []

    const raw: QuizOption[] = [
      ...correctPicks.map(s => ({ label: '', solution: s, correct: !negative })),
      ...wrongPicks.slice(0, numWrong).map(s => ({ label: '', solution: s, correct: negative })),
    ]
    return this.arrangeOptions(raw, effectiveAllC)
  }

  private arrangeOptions(options: QuizOption[], allC: boolean): QuizOption[] {
    if (allC) {
      const correct = options.filter(o => o.correct)
      const wrong = options.filter(o => !o.correct)
      if (correct.length >= 1 && wrong.length >= 3) {
        const shuffledWrong = wrong.sort(() => Math.random() - 0.5)
        const result = [shuffledWrong[0], shuffledWrong[1], correct[0], shuffledWrong[2]]
        result.forEach((o, i) => {
          o.label = OPTION_LABELS[i]
        })
        return result
      }
    }
    const shuffled = options.sort(() => Math.random() - 0.5)
    shuffled.forEach((o, i) => {
      o.label = OPTION_LABELS[i]
    })
    return shuffled
  }

  private generateFallbackQuestion(type: QuestionType, negative: boolean): QuizQuestion {
    const scramble =
      type === QuestionType.HTR_BEST_LEAVE_SLICE
        ? generateScramble(ScrambleType.HTR)
        : generateScramble(ScrambleType.DR)
    const movePool = type === QuestionType.HTR_BEST_LEAVE_SLICE ? HTR_MOVE_POOL : DR_MOVE_POOL
    const options: QuizOption[] = OPTION_LABELS.map((label, i) => ({
      label,
      solution: Array.from(
        { length: Math.floor(Math.random() * 3) + 1 },
        () => movePool[Math.floor(Math.random() * movePool.length)],
      ).join(' '),
      correct: i === 0 ? !negative : negative,
    }))
    return { type, scramble, negative, options }
  }
}
