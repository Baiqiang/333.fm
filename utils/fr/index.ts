import { Algorithm, Cube, InvalidAlgorithmStringError } from 'insertionfinder'

import { formatAlgorithm, removeComment } from '~/utils/if'

import { classifyAxis, isFrShape, isHtrState } from './analysis'
import { applyMoves, type AxisIndex, type CubeState, ScrambleParseError } from './cube'
import { cubeStateFromInsertionfinder } from './if-state'
import { isTrueFr, solveAxis, solveAxisShape } from './solver'
import {
  AXIS_INDEX,
  AXIS_LIST,
  type AxisResult,
  FR_TRIGGERS,
  type FrAnalysis,
  type SolutionStep,
} from './types'

export { isValidToken } from './cube'
export { generateHtrScramble } from './scramble'
export { isTrueFr } from './solver'
export * from './types'
export {
  isValidTokenPrefix,
  parsePracticeSolutionInput,
  type PracticeInputState,
  type PracticeInputStatus,
  type VerifyFrResult,
  verifyFrSolution,
} from './validate'

function buildCaseLabel(edgeLabel: string, cornerLabel: string): string {
  return `${edgeLabel} / ${cornerLabel}`
}

/** Replay a solution step by step; record shape label and trigger hint after each move. */
function decompose(
  state: CubeState,
  moves: string[],
  axis: AxisIndex,
  leaveSlice = true,
): SolutionStep[] {
  const stepOf = (cur: CubeState, move: string | null): SolutionStep => {
    const c = classifyAxis(cur, axis)
    const caseLabel = buildCaseLabel(c.edgeLabel, c.cornerLabel)
    return {
      move,
      caseLabel,
      trueFr: isTrueFr(cur, axis, leaveSlice),
      // Trigger formulas are Leave-slice finishing moves; they don't apply in full mode.
      trigger: leaveSlice ? FR_TRIGGERS[caseLabel] : undefined,
    }
  }
  const steps: SolutionStep[] = [stepOf(state, null)]
  let cur = state
  for (const m of moves) {
    cur = applyMoves(cur, [m])
    steps.push(stepOf(cur, m))
  }
  return steps
}

function cubeStateFromInput(scramble: string, solution: string): CubeState {
  const cube = new Cube()
  if (scramble.trim())
    cube.twist(new Algorithm(formatAlgorithm(scramble)))
  if (solution.trim())
    cube.twist(new Algorithm(removeComment(solution)))
  return cubeStateFromInsertionfinder(cube)
}

function displayMoves(scramble: string, solution: string, formattedScramble: string): string {
  return [formattedScramble, solution.trim()].filter(Boolean).join('\n')
}

/** Analyze an HTR state from optional scramble + solution (复原); return FR shape and reference steps. */
export function analyzeScramble(scramble: string, solution: string = '', leaveSlice: boolean = true): FrAnalysis {
  let formattedScramble = ''

  try {
    if (scramble.trim())
      formattedScramble = formatAlgorithm(scramble).trim()
    if (solution.trim())
      new Algorithm(removeComment(solution))
    if (!scramble.trim() && !solution.trim())
      throw new ScrambleParseError('')
  }
  catch (e) {
    if (e instanceof ScrambleParseError || e instanceof InvalidAlgorithmStringError) {
      const raw = [scramble, solution].map(s => s.trim()).filter(Boolean).join('\n')
      return {
        ok: false,
        errorToken: e instanceof InvalidAlgorithmStringError ? raw : e.message,
        isHtr: false,
        scramble: raw,
        axes: [],
      }
    }
    throw e
  }

  const trimmed = displayMoves(scramble, solution, formattedScramble)

  let state: CubeState
  try {
    state = cubeStateFromInput(scramble, solution)
  }
  catch (e) {
    if (e instanceof InvalidAlgorithmStringError) {
      return {
        ok: false,
        errorToken: trimmed,
        isHtr: false,
        scramble: trimmed,
        axes: [],
      }
    }
    throw e
  }

  const htr = isHtrState(state)

  // Corner shape / bad-edge classification is only meaningful in HTR states
  const axes: AxisResult[] = htr
    ? AXIS_LIST.map(({ key, axis }) => {
      const cls = classifyAxis(state, axis)

      // Full-solve mode: shortest sequence to fully reduce the axis (true FR only,
      // no false FR / shape distinction). Keep the classification header only.
      if (!leaveSlice) {
        const solution = solveAxis(state, axis, false)
        return {
          axisKey: key,
          ...cls,
          solution,
          shapeSolution: null,
          alreadyFr: solution !== null && solution.length === 0,
          inputFalseFr: false,
          shapeIsFalseFr: false,
          caseLabel: buildCaseLabel(cls.edgeLabel, cls.cornerLabel),
          decomposition: solution ? decompose(state, solution, axis, false) : [],
          shapeDecomposition: null,
        }
      }

      const solution = solveAxis(state, axis)
      const shapeSolution = solveAxisShape(state, axis)

      // Input is already FR shape but not true FR => false FR
      const inputFalseFr
          = isFrShape(state, axis) && !isTrueFr(state, axis)

      // Whether finishing via shortest shape solution yields false FR
      let shapeIsFalseFr = false
      if (shapeSolution && shapeSolution.length > 0) {
        const shaped = applyMoves(state, shapeSolution)
        shapeIsFalseFr = !isTrueFr(shaped, AXIS_INDEX[key])
      }

      return {
        axisKey: key,
        ...cls,
        solution,
        shapeSolution,
        alreadyFr: solution !== null && solution.length === 0,
        inputFalseFr,
        shapeIsFalseFr,
        caseLabel: buildCaseLabel(cls.edgeLabel, cls.cornerLabel),
        decomposition: solution ? decompose(state, solution, axis) : [],
        shapeDecomposition:
            shapeIsFalseFr && shapeSolution
              ? decompose(state, shapeSolution, axis)
              : null,
      }
    })
    : []

  return { ok: true, isHtr: htr, scramble: trimmed, axes }
}
