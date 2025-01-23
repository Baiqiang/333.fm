import { Algorithm, Cube } from 'insertionfinder'

export enum TurnMetric {
  HTM,
  QTM,
  STM,
  ATM,
}

export function reverseTwists(twists: string) {
  return twists
    .split(' ')
    .map((twist) => {
      if (twist.endsWith('2'))
        return twist

      if (twist.endsWith('\''))
        return twist[0]

      return `${twist}'`
    })
    .reverse()
    .join(' ')
}

export function replaceQuote(string: string): string {
  return string.replaceAll(/[‘’`]/g, '\'')
}

export function formatAlgorithm(string: string | string[], placement: number = 0) {
  string = removeComment(string)
  const algorithm = new Algorithm(string)
  algorithm.clearFlags(placement)
  algorithm.normalize()
  return algorithm.toString()
}

export function formatAlgorithmToArray(string: string | string[]) {
  return formatAlgorithm(string).split(' ').filter(a => a !== '')
}

export function removeComment(string: string | string[]) {
  if (Array.isArray(string))
    string = string.join(' ')

  // remove comments
  string = replaceQuote(string)
  return string.split('\n').map(s => s.split('//')[0]).join('')
}

export function isSwappable(a: string, b: string): boolean {
  if (!a || !b)
    return false

  const alg = new Algorithm(`${a} ${b}`)
  if (alg.length < 2) {
    return false
  }
  // if two twists are on the same axis, they are swappable
  // e.g. R L, R2 L2, R' L'
  const isSwappable = alg.twists[0] >>> 3 === alg.twists[1] >>> 3
  return isSwappable
}

export function isSlice(a: string, b: string): boolean {
  if (!a || !b)
    return false
  const alg = new Algorithm(`${a} ${b}`)
  // if two twists are on the same axis and the sum of the twists is 8, 24, or 40, they are slice moves
  // e.g. L R', L' R, L2 R2
  const isSlice = [8, 24, 40].includes(alg.twists[0] + alg.twists[1])
  return isSlice
}

export function isSameFace(a: string, b: string): boolean {
  if (!a || !b)
    return false
  return a.charAt(0) === b.charAt(0)
}

export function isRotation(a?: string): boolean {
  if (!a)
    return false
  return 'xyz'.includes(a.charAt(0))
}

export function algLength(alg: string, turnMetric: TurnMetric = TurnMetric.HTM): number {
  // filter out rotations
  const algArray = new Algorithm(alg).toString().split(' ').filter(a => !'xyz'.includes(a.charAt(0)))
  const htm = algArray.length
  switch (turnMetric) {
    case TurnMetric.QTM:
      // count half turns twice for QTM
      return htm + algArray.filter(a => a.endsWith('2')).length
    case TurnMetric.STM:
    {
      let stm = 0
      for (let i = 0; i < algArray.length; i++) {
        const move = algArray[i]
        const nextMove = algArray[i + 1]
        // if it's a slice move, skip the next move
        if (isSlice(move, nextMove)) {
          i++
        }
        stm++
      }
      return stm
    }
    case TurnMetric.ATM:
      // reduce the number of moves by the number of swappable moves
      // e.g. R L R' L' is written in 4 moves but only 1 move in ATM
      return htm - algArray.filter((a, i) => i < algArray.length - 1 && isSwappable(a, algArray[i + 1])).length
    case TurnMetric.HTM:
    default:
      return htm
  }
}

export function getCubieCube(cube: Cube) {
  return {
    corners: cube.getRawCorners(),
    edges: cube.getRawEdges(),
    placement: cube.placement,
  }
}
