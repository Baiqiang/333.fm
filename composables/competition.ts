import { Algorithm, Cube } from 'insertionfinder'

export function useComputedState(props: { scramble: Scramble }, form: { solution: string }) {
  const solutionAlg = computed(() => {
    // check NISS and ()
    if (form.solution.includes('NISS') || form.solution.includes('('))
      return null
    try {
      return replaceQuote(form.solution)
    }
    catch (e) {
      return null
    }
  })
  const isSolved = computed<boolean>(() => {
    if (!solutionAlg.value)
      return false

    const cube = new Cube()
    cube.twist(new Algorithm(props.scramble.scramble))
    cube.twist(new Algorithm(formatAlgorithm(solutionAlg.value)))
    if (cube.getCornerCycles() > 0
      || cube.getEdgeCycles() > 0
      || cube.getCenterCycles() > 0
      || cube.hasParity())
      return false
    return true
  })
  const moves = computed<number>(() => {
    if (!isSolved.value || !solutionAlg.value)
      return DNF
    try {
      const solution = new Algorithm(solutionAlg.value)
      const moves = solution.twists.length + solution.inverseTwists.length
      if (moves > 80)
        return DNF
      return moves
    }
    catch (e) {
      return DNF
    }
  })
  return {
    moves,
    isSolved,
    solutionAlg,
  }
}
