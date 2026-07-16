import type { PensukeParseResult } from './types'

import { Algorithm, Cube, InvalidAlgorithmStringError } from 'insertionfinder'
import { isHtrState } from '~/utils/fr/analysis'
import { ScrambleParseError } from '~/utils/fr/cube'
import { cubeStateFromInsertionfinder } from '~/utils/fr/if-state'

import { formatAlgorithm, removeComment } from '~/utils/if'

function reverseMoves(moves: string[]): string[] {
  const rev: string[] = []
  for (let i = moves.length - 1; i >= 0; i--) {
    const m = moves[i]
    if (m.length === 1)
      rev.push(`${m}'`)
    else if (m[1] === '2')
      rev.push(m)
    else if (m[1] === '\'')
      rev.push(m[0])
    else rev.push(m)
  }
  return rev
}

function tokenize(alg: string): string[] {
  return alg.trim().split(/\s+/).filter(Boolean)
}

export function parsePensukeInput(scramble: string, solution: string): PensukeParseResult {
  const trimmed = [scramble.trim(), solution.trim()].filter(Boolean).join('\n')

  try {
    if (scramble.trim())
      formatAlgorithm(scramble)
    if (solution.trim()) {
      const solClean = removeComment(solution)
      if (solClean.trim())
        void new Algorithm(solClean)
    }
    if (!scramble.trim() && !solution.trim())
      throw new ScrambleParseError('')
  }
  catch (e) {
    if (e instanceof ScrambleParseError || e instanceof InvalidAlgorithmStringError) {
      return {
        ok: false,
        errorToken: e instanceof InvalidAlgorithmStringError ? trimmed : (e as ScrambleParseError).message,
        scramble: trimmed,
        scrambleMoves: [],
        normal: [],
        inverse: [],
        drAxis: '',
        lastDirection: 'normal',
        state: null,
        isHtr: false,
      }
    }
    throw e
  }

  const cube = new Cube()
  const normalTokens: string[] = []
  const inverseTokens: string[] = []
  let lastDirection: 'normal' | 'inverse' = 'normal'

  try {
    if (scramble.trim())
      cube.twist(new Algorithm(formatAlgorithm(scramble)))

    const solClean = removeComment(solution)
    if (solClean.trim()) {
      const alg = new Algorithm(solClean)
      cube.twist(alg)
      // Extract normal/inverse token lists from formatted solution
      const parts = solClean.replace(/\(/g, ' ( ').replace(/\)/g, ' ) ').split(/\s+/).filter(Boolean)
      let inv = false
      for (const p of parts) {
        if (p === '(') {
          inv = true
          continue
        }
        if (p === ')') {
          inv = false
          continue
        }
        if (inv)
          inverseTokens.push(p)
        else normalTokens.push(p)
      }
      if (inverseTokens.length > normalTokens.length)
        lastDirection = 'inverse'
    }
  }
  catch (e) {
    if (e instanceof InvalidAlgorithmStringError) {
      return {
        ok: false,
        errorToken: trimmed,
        scramble: trimmed,
        scrambleMoves: [],
        normal: [],
        inverse: [],
        drAxis: 'U/D',
        lastDirection: 'normal',
        state: null,
        isHtr: false,
      }
    }
    throw e
  }

  const state = cubeStateFromInsertionfinder(cube)
  const isHtr = isHtrState(state)

  return {
    ok: true,
    scramble: trimmed,
    scrambleMoves: scramble.trim() ? tokenize(formatAlgorithm(scramble)) : [],
    normal: normalTokens.length ? normalTokens : tokenize(formatAlgorithm(scramble)),
    inverse: inverseTokens.length ? reverseMoves(inverseTokens) : [],
    drAxis: 'U/D',
    lastDirection,
    state,
    isHtr,
  }
}
