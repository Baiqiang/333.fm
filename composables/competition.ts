import { Algorithm, Cube } from 'insertionfinder'

export function useComputedState(props: { scramble: Scramble }, form: { solution: string }) {
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
      const moves = solutionAlg.value.twists.length + solutionAlg.value.inverseTwists.length
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
