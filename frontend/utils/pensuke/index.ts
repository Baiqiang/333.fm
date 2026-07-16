import type { AxisKey } from './types'

import { applyMoves, isValidToken } from '~/utils/fr/cube'

import { isLeaveSliceGoal } from './ls'
import { parsePensukeInput } from './parse'

export { generateHtrScramble } from '~/utils/fr/scramble'
export { parsePensukeInput } from './parse'
export { solveLeaveSlice } from './solver'

export function verifyLsSolutionSync(
  scramble: string,
  userSolution: string,
  lsAxis: AxisKey = 'ud',
): { ok: boolean, correct: boolean, errorToken?: string, userMoves: string[] } {
  const userMoves = userSolution.trim().split(/\s+/).filter(Boolean)
  for (const tok of userMoves) {
    if (!isValidToken(tok))
      return { ok: false, correct: false, errorToken: tok, userMoves }
  }

  const parse = parsePensukeInput(scramble, '')
  if (!parse.ok || !parse.state)
    return { ok: false, correct: false, errorToken: parse.errorToken, userMoves }

  try {
    const state = applyMoves(parse.state, userMoves)
    return { ok: true, correct: isLeaveSliceGoal(state, lsAxis), userMoves }
  }
  catch (e) {
    return { ok: false, correct: false, errorToken: String(e), userMoves }
  }
}

export type PensukePracticeInputStatus = 'empty' | 'typing' | 'valid' | 'invalid' | 'ls'

export interface PensukePracticeInputState {
  status: PensukePracticeInputStatus
  appliedMoves: string[]
  invalidToken?: string
}

const MOVE_PREFIX = /^[UDRLFB](?:2|')?$/

export function parsePensukePracticeInput(
  scramble: string,
  userSolution: string,
  lsAxis: AxisKey = 'ud',
): PensukePracticeInputState {
  const raw = userSolution
  if (!raw.trim())
    return { status: 'empty', appliedMoves: [] }

  const endsWithSpace = /\s$/.test(raw)
  const trimmedEnd = raw.trimEnd()
  const parts = trimmedEnd.split(/\s+/).filter(Boolean)

  let completeMoves: string[]
  let trailing: string | null = null

  if (endsWithSpace) {
    completeMoves = parts
  }
  else {
    trailing = parts[parts.length - 1] ?? null
    completeMoves = parts.length > 1 ? parts.slice(0, -1) : []
  }

  for (const tok of completeMoves) {
    if (!isValidToken(tok))
      return { status: 'invalid', appliedMoves: completeMoves, invalidToken: tok }
  }

  if (trailing !== null) {
    if (!MOVE_PREFIX.test(trailing) && !isValidToken(trailing))
      return { status: 'invalid', appliedMoves: completeMoves, invalidToken: trailing }
    if (!isValidToken(trailing))
      return { status: 'typing', appliedMoves: completeMoves }
    completeMoves = [...completeMoves, trailing]
  }

  if (completeMoves.length === 0)
    return { status: 'typing', appliedMoves: [] }

  const result = verifyLsSolutionSync(scramble, completeMoves.join(' '), lsAxis)
  if (!result.ok)
    return { status: 'invalid', appliedMoves: completeMoves, invalidToken: result.errorToken }
  if (result.correct)
    return { status: 'ls', appliedMoves: completeMoves }
  return { status: 'valid', appliedMoves: completeMoves }
}
