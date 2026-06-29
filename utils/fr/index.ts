import { classifyAxis, isFrShape, isHtrState } from './analysis'
import { applyMoves, applyScramble, type AxisIndex, type CubeState, ScrambleParseError } from './cube'
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
): SolutionStep[] {
  const stepOf = (cur: CubeState, move: string | null): SolutionStep => {
    const c = classifyAxis(cur, axis)
    const caseLabel = buildCaseLabel(c.edgeLabel, c.cornerLabel)
    return { move, caseLabel, trueFr: isTrueFr(cur, axis), trigger: FR_TRIGGERS[caseLabel] }
  }
  const steps: SolutionStep[] = [stepOf(state, null)]
  let cur = state
  for (const m of moves) {
    cur = applyMoves(cur, [m])
    steps.push(stepOf(cur, m))
  }
  return steps
}

/** Analyze an HTR scramble; return FR shape and reference steps for all three axes. */
export function analyzeScramble(scramble: string): FrAnalysis {
  const trimmed = scramble.trim()
  let state
  try {
    state = applyScramble(trimmed)
  }
  catch (e) {
    if (e instanceof ScrambleParseError) {
      return {
        ok: false,
        errorToken: e.message,
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
