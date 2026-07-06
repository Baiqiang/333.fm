import {
  calculateSolutionScore,
  DNF,
  funChallengeMetric,
  isCenterSolvedChallenge,
  isFunChallengeSubType,
  MoveMetric,
} from '@333fm/utils'
import { Algorithm, Cube } from 'insertionfinder'

export function useComputedState(props: { scramble: Scramble, competition?: Competition }, form: { solution: string }) {
  const challengeMetric = computed<MoveMetric | null>(() => {
    const subType = props.competition?.subType
    if (typeof subType !== 'number' || !isFunChallengeSubType(subType))
      return null

    return funChallengeMetric(subType)
  })
  const requireCentersRestored = computed<boolean>(() => {
    const subType = props.competition?.subType
    return typeof subType === 'number' && isCenterSolvedChallenge(subType)
  })
  const solutionAlg = computed(() => {
    // check NISS and ()
    if (form.solution.includes('NISS') || form.solution.includes('('))
      return null
    try {
      return new Algorithm(replaceQuote(form.solution))
    }
    catch (e) {
      return null
    }
  })
  const scrambledCube = computed(() => {
    if (props.scramble.cubieCube) {
      const cubieCube = props.scramble.cubieCube
      return Cube.fromCubieCube(cubieCube.corners, cubieCube.edges, cubieCube.placement)
    }

    const cube = new Cube()
    cube.twist(new Algorithm(props.scramble.scramble))
    return cube
  })
  const isSolved = computed<boolean>(() => {
    if (!solutionAlg.value)
      return false

    const cube = scrambledCube.value.clone()
    cube.twist(solutionAlg.value)
    const bestCube = cube.getBestPlacement()
    return bestCube.isSolved()
  })
  const moves = computed<number>(() => {
    if (!isSolved.value || !solutionAlg.value)
      return DNF
    try {
      const score = calculateSolutionScore(
        props.scramble.scramble,
        form.solution,
        challengeMetric.value || MoveMetric.HTM,
      )
      if (score.moves === DNF)
        return DNF
      return score.moves / 100
    }
    catch (e) {
      return DNF
    }
  })
  const htmMoves = computed<number>(() => {
    if (!challengeMetric.value || !isSolved.value || !solutionAlg.value)
      return DNF
    try {
      const score = calculateSolutionScore(props.scramble.scramble, form.solution, MoveMetric.HTM)
      if (score.moves === DNF)
        return DNF
      return score.moves / 100
    }
    catch (e) {
      return DNF
    }
  })
  const centersRestored = computed<boolean | null>(() => {
    if (!requireCentersRestored.value)
      return null

    return calculateSolutionScore(props.scramble.scramble, form.solution, MoveMetric.HTM, {
      requireCentersRestored: true,
    }).centersRestored
  })
  return {
    moves,
    htmMoves,
    isSolved,
    solutionAlg,
    centersRestored,
    challengeMetric,
  }
}
