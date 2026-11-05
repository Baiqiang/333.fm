import type { SliceGoal } from '@333fm/utils'
import { isDsGoal } from '@333fm/utils'
import { Algorithm, Cube } from 'insertionfinder'

import { applyMoves, isValidToken } from '~/utils/fr/cube'

import { isLeaveSliceGoal } from './ls'
import { parsePensukeInput } from './parse'

export { parsePensukeInput } from './parse'
export { solveLeaveSlice } from './solver'
export { generateHtrScramble } from '~/utils/fr/scramble'

export function verifySliceSolutionSync(
  scramble: string,
  userSolution: string,
  goal: SliceGoal,
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
    if (goal.mode === 'ds') {
      const cube = new Cube()
      cube.twist(new Algorithm(scramble))
      cube.twist(new Algorithm(userMoves.join(' ')))
      return { ok: true, correct: isDsGoal(cube, goal.axis, goal.secondSlice), userMoves }
    }
    const state = applyMoves(parse.state, userMoves)
    return { ok: true, correct: isLeaveSliceGoal(state, goal.axis), userMoves }
  }
  catch (e) {
    return { ok: false, correct: false, errorToken: String(e), userMoves }
  }
}

export type PensukePracticeInputStatus = 'empty' | 'typing' | 'valid' | 'invalid' | 'reached'

export interface PensukePracticeInputState {
  status: PensukePracticeInputStatus
  appliedMoves: string[]
  invalidToken?: string
}

const MOVE_PREFIX = /^[UDRLFB](?:2|')?$/

export function parsePensukePracticeInput(
  scramble: string,
  userSolution: string,
  goal: SliceGoal,
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

  const result = verifySliceSolutionSync(scramble, completeMoves.join(' '), goal)
  if (!result.ok)
    return { status: 'invalid', appliedMoves: completeMoves, invalidToken: result.errorToken }
  if (result.correct)
    return { status: 'reached', appliedMoves: completeMoves }
  return { status: 'valid', appliedMoves: completeMoves }
}
