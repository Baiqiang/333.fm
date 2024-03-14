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
  const parentSkeleton = computed(() => flattenSkeleton(props.tree))
  const parentSkeletonAlg = computed(() => {
    const alg = new Algorithm(parentSkeleton.value)
    alg.cancelMoves()
    return alg
  })
  const isInsertion = computed(() => form.mode === SolutionMode.INSERTIONS)
  const nextSkeleton = computed(() => isInsertion.value ? getNextSkeleton(form.insertions[form.insertions.length - 1], true) : '')
  const skeleton = computed(() => {
    if (!isInsertion.value) {
      return parentSkeleton.value + form.solution
    }
    else {
      const alg = new Algorithm(nextSkeleton.value)
      alg.cancelMoves()
      let skeleton = alg.toString()
      if (form.inverse)
        skeleton = reverseTwists(skeleton)
      return skeleton
    }
  })
  const solutionAlg = computed(() => {
    try {
      let alg: Algorithm
      if (!isInsertion.value) {
        alg = new Algorithm(form.solution)
      }
      else {
        let skeleton = nextSkeleton.value
        if (form.inverse)
          skeleton = reverseTwists(skeleton)

        alg = new Algorithm(skeleton)
      }
      alg.normalize()
      alg.cancelMoves()
      return alg
    }
    catch (e) {
      return null
    }
  })
  const skeletonAlg = computed(() => {
    try {
      const alg = new Algorithm(skeleton.value)
      alg.cancelMoves()
      return alg
    }
    catch (e) {
      return new Algorithm('')
    }
  })
  const cube = computed(() => {
    const cube = new Cube()
    cube.twist(new Algorithm(props.scramble.scramble))
    cube.twist(skeletonAlg.value)
    return cube
  })
  const phase = computed(() => getPhase(cube.value))
  const moves = computed(() => {
    if (!isInsertion.value) {
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
  const cumulativeMoves = computed(() => {
    if (!isInsertion.value)
      return skeletonAlg.value.length * 100
    else
      return countMoves(solutionAlg.value?.toString() ?? '')
  })
  const cancelMoves = computed(() => {
    if (!solutionAlg.value)
      return 0
    if (!isInsertion.value) {
      const totalMoves = moves.value + parentSkeletonAlg.value.length * 100
      return totalMoves - skeletonAlg.value.length * 100
    }
    else {
      return moves.value + parentSkeletonAlg.value.length * 100 - cumulativeMoves.value
    }
  })
  const status = computed(() => getStatus(cube.value, phase.value))

  return {
    cube,
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
  return skeletons.join('\n')
}

export function flattenPhases(scramble: Scramble, submission: Submission | null) {
  const submissions: Submission[] = []
  let parent = submission
  while (parent) {
    submissions.unshift(parent)
    parent = parent.parent
  }
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
    const moves = alg.length * 100
    const cumulativeAlg = new Algorithm(skeleton)
    const cube = new Cube()
    cube.twist(new Algorithm(scramble.scramble))
    cube.twist(cumulativeAlg)
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

export function getNextSkeleton(chainInsertion: ChainInsertion, cancelMoves = false) {
  if (!chainInsertion)
    return ''

  const { skeleton, insertPlace, insertion } = chainInsertion
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

export function checkLastQuarterTurns(twists: readonly number[], inverseTwists: readonly number[]) {
  const last = twists[twists.length - 1]
  const lastInverse = inverseTwists[inverseTwists.length - 1]
  if (last !== undefined && !isClockwise(last))
    return false

  if (lastInverse !== undefined && !isClockwise(lastInverse))
    return false

  if (last !== undefined && lastInverse !== undefined && !isSwapable(last, lastInverse))
    return false

  const penultimate = twists[twists.length - 2]
  const penultimateInverse = inverseTwists[inverseTwists.length - 2]
  if (penultimate !== undefined && isSwapable(penultimate, last) && [penultimate, last].some(isHalfTurn))
    return false

  if (
    penultimateInverse !== undefined
    && isSwapable(penultimateInverse, lastInverse)
    && [penultimateInverse, lastInverse].some(isHalfTurn)
  )
    return false

  return true
}

export function isSwapable(twistA: number, twistB: number) {
  return twistA >>> 3 === twistB >>> 3
}

export function isClockwise(twist: number) {
  return twist % 4 === 1
}

export function isHalfTurn(twist: number) {
  return twist % 4 === 2
}
