import type { Slice, SliceGoal } from '@333fm/utils'
import { matchingDsSlices, sampleSliceState, solveSliceHalfTurns } from '@333fm/utils'
import { Algorithm, Cube } from 'insertionfinder'
import min2phase from 'min2phase.js'

export interface SlicePracticeProblem {
  scramble: string
  solution: string[]
  dsTargets: Slice[]
}

let initialized = false

function describeProblem(scramble: string, cube: Cube, solution: string[], goal: SliceGoal): SlicePracticeProblem {
  const end = cube.clone()
  end.twist(new Algorithm(solution.join(' ')))
  return { scramble, solution, dsTargets: goal.mode === 'ds' ? matchingDsSlices(end, goal.axis) : [] }
}

export function generateSlicePracticeProblem(goal: SliceGoal, maxMoves: number): SlicePracticeProblem {
  const { cube, solution } = sampleSliceState(goal, maxMoves)
  if (!initialized) {
    min2phase.initFull()
    initialized = true
  }
  const facelets = cube.toFaceletString()
  // insertionfinder: U D R L F B; min2phase: U R F D L B.
  const input = [0, 2, 4, 1, 3, 5].map(i => facelets.slice(i * 9, i * 9 + 9)).join('')
  const result = new min2phase.Search().solution(input, 21, 1e9, 0, min2phase.INVERSE_SOLUTION)
  if (result.includes('Error'))
    throw new Error(`Unable to generate scramble: ${result}`)
  // Keep the solved state representable in the existing nonempty input parser.
  const scramble = result.trim().replace(/\s+/g, ' ') || 'U2 U2'
  const replay = new Cube()
  replay.twist(new Algorithm(scramble))
  if (replay.toFaceletString() !== facelets)
    throw new Error('Scramble does not reproduce the selected HTR state')
  return describeProblem(scramble, cube, solution, goal)
}

export function solveSlicePracticeScramble(scramble: string, goal: SliceGoal): SlicePracticeProblem {
  const cube = new Cube()
  cube.twist(new Algorithm(scramble))
  return describeProblem(scramble, cube, solveSliceHalfTurns(cube, goal), goal)
}
