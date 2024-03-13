import { Algorithm, Cube, centerCycleTable } from 'insertionfinder'
import { SubmissionPhase } from '~/utils/competition'

export interface ChainInsertion {
  skeleton: string
  insertPlace: number
  insertion: string
}

export enum SolutionMode {
  REGULAR,
  INSERTIONS,
}

export function countMoves(skeleton: string): number {
  try {
    const alg = new Algorithm(skeleton)
    return alg.length * 100
  }
  catch (e) {
    return 0
  }
}

export function useComputedPhases(
  props: { scramble: Scramble, tree: Submission | null },
  form: { solution: string, mode: SolutionMode, insertions: ChainInsertion[], inverse: boolean },
) {
  const skeleton = computed(() => flattenSkeleton(props.tree))
  const solutionAlg = computed(() => {
    try {
      if (form.mode === SolutionMode.REGULAR) {
        return new Algorithm(form.solution)
      }
      else {
        const insertions = form.insertions
        const lastInsertion = insertions[insertions.length - 1]
        let nextSkeleton = getNextSkeleton(lastInsertion, true)
        if (form.inverse)
          nextSkeleton = reverseTwists(nextSkeleton)

        return new Algorithm(nextSkeleton)
      }
    }
    catch (e) {
      return null
    }
  })
  const skeletonAlg = computed(() => {
    const alg = new Algorithm(skeleton.value)
    alg.cancelMoves()
    return alg
  })
  const cube = computed(() => {
    const cube = new Cube()
    cube.twist(new Algorithm(props.scramble.scramble))
    if (form.mode === SolutionMode.REGULAR)
      cube.twist(skeletonAlg.value)
    if (solutionAlg.value)
      cube.twist(solutionAlg.value)

    return cube
  })
  const phase = computed(() => getPhase(cube.value))
  const moves = computed(() => {
    if (form.mode === SolutionMode.REGULAR) {
      return countMoves(form.solution)
    }
    else {
      try {
        const insertions = form.insertions
        return insertions.reduce((acc, insertion) => acc + countMoves(insertion.insertion), 0)
      }
      catch (e) {
        return 0
      }
    }
  })
  const cancelMoves = computed(() => {
    if (!solutionAlg.value)
      return 0
    if (form.mode === SolutionMode.REGULAR) {
      const alg = new Algorithm(skeletonAlg.value.toString() + solutionAlg.value.toString())
      const totalMoves = alg.length
      alg.cancelMoves()
      return (totalMoves - alg.length) * 100
    }
    else {
      const insertions = form.insertions
      const skeletonLength = formatAlgorithmToArray(insertions[0].skeleton).length
      return (skeletonLength - solutionAlg.value.length) * 100 + moves.value
    }
  })
  const cumulativeMoves = computed(() => skeletonAlg.value.length * 100 + moves.value - cancelMoves.value)
  const status = computed(() => getStatus(cube.value, phase.value))

  return {
    cube,
    skeleton,
    solutionAlg,
    phase,
    moves,
    cumulativeMoves,
    cancelMoves,
    status,
  }
}

export function getPhase(cube: Cube) {
  const bestCube = cube.getBestPlacement()
  let phase = SubmissionPhase.SCRAMBLED
  const eoStatus = bestCube.getEdgeOrientationStatus()
  const drStatus = bestCube.getDominoReductionStatus()
  if (bestCube.isSolved())
    return SubmissionPhase.FINISHED
  else if (bestCube.isHalfTurnReductionSolved())
    phase = SubmissionPhase.HTR
  else if (drStatus.length > 0)
    phase = SubmissionPhase.DR
  else if (eoStatus.length > 0)
    phase = SubmissionPhase.EO
  else
    phase = SubmissionPhase.SCRAMBLED

  // check if skeleton is LxEyC
  const cornerCycles = bestCube.getCornerCycles()
  const edgeCycles = bestCube.getEdgeCycles()
  if (cornerCycles + edgeCycles <= 3)
    phase = SubmissionPhase.SKELETON

  return phase
}

export function flattenSkeleton(submission: Submission | null): string {
  let parent = submission
  const skeletons: string[] = []
  while (parent) {
    skeletons.unshift(parent.solution)
    parent = parent.parent
  }
  return skeletons.join(' ')
}

export function flattenPhases(scramble: Scramble, submission: Submission | null) {
  const submissions: Submission[] = []
  let parent = submission
  while (parent) {
    submissions.unshift(parent)
    parent = parent.parent
  }
  const cube = new Cube()
  cube.twist(new Algorithm(scramble.scramble))
  const phases: {
    submission: Submission
    scramble: Scramble
    solution: string
    phase: SubmissionPhase
    status: string
    moves: number
    cumulativeMoves: number
    cancelMoves: number
  }[] = []
  let cumulativeMoves = 0
  let skeleton = ''
  for (const submission of submissions) {
    skeleton += submission.solution
    const alg = new Algorithm(submission.solution)
    cube.twist(alg)
    const moves = alg.length * 100
    const cumulativeAlg = new Algorithm(skeleton)
    cumulativeAlg.cancelMoves()
    cumulativeMoves += moves
    const cancelMoves = cumulativeMoves - cumulativeAlg.length * 100
    cumulativeMoves -= cancelMoves
    const status = getStatus(cube, submission.phase)
    phases.push({
      submission,
      scramble,
      solution: submission.solution,
      phase: submission.phase,
      status,
      moves,
      cumulativeMoves,
      cancelMoves,
    })
  }
  return phases
}

export function getStatus(cube: Cube, phase: SubmissionPhase): string {
  switch (phase) {
    case SubmissionPhase.EO:
      return cube.getEdgeOrientationStatus().join(',')
    case SubmissionPhase.DR:
      return cube.getDominoReductionStatus().join(',')
    case SubmissionPhase.SKELETON:
    {
      const bestCube = cube.getBestPlacement()
      const placement = bestCube.placement
      const centerCycles = centerCycleTable[placement]
      const cycleDetail = {
        corner: bestCube.getCornerStatus(),
        edge: bestCube.getEdgeStatus(),
        center: centerCycles > 0
          ? [
              {
                length: centerLength(centerCycles, placement),
              },
            ]
          : [],
      }
      return `L${formatCycleDetail(cycleDetail)}`
    }
  }
  return ''
}

export function getNextSkeleton({ skeleton, insertPlace, insertion }: ChainInsertion, cancelMoves = false) {
  const twists = skeleton.split(' ')
  try {
    const alg = new Algorithm(`${twists.slice(0, insertPlace).join(' ')} ${insertion} ${twists.slice(insertPlace).join(' ')}`)
    if (cancelMoves)
      alg.cancelMoves()
    return alg.toString()
  }
  catch (e) {
    return ''
  }
}
