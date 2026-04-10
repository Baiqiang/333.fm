import type { User } from './user'

export interface QuizInfo {
  id: number
  day: string
  questionCount: number
  isToday: boolean
}

export interface QuizOptionData {
  index: number
  label: string
  solution: string
  correct?: boolean
}

export interface QuizQuestionData {
  index: number
  type: number
  negative: boolean
  scramble: string
  drAxis?: string
  lastMove?: string
  options: QuizOptionData[]
}

export interface SubmissionData {
  id: number
  started: boolean
  finished: boolean
  answers: number[][]
  correctCount?: number
  totalQuestions: number
  remainingTime: number
  startedAt: number | null
}

export interface QuizResponse {
  quiz: QuizInfo | null
  questions?: QuizQuestionData[]
  submission: SubmissionData | null
}

export interface LeaderboardEntry {
  rank: number
  user: User
  correctCount: number
  totalQuestions: number
  remainingTime: number
}

export interface HistoryResponse {
  items: QuizInfo[]
  total: number
  page: number
  limit: number
}
