import { Algorithm, Cube } from 'insertionfinder'

export function replaceQuote(string: string): string {
  return string.replace(/[‘’`′]/g, "'")
}

export function removeComment(string: string | string[]): string {
  if (Array.isArray(string)) string = string.join(' ')

  return replaceQuote(string)
    .split('\n')
    .map(s => s.split('//')[0])
    .join('')
}

export function formatAlgorithm(string: string | string[], placement = 0): string {
  string = removeComment(string)
  const algorithm = new Algorithm(string)
  algorithm.clearFlags(placement)
  algorithm.normalize()
  return algorithm.toString()
}

export function formatAlgorithmToArray(string: string | string[]): string[] {
  return formatAlgorithm(string).split(' ').filter(a => a !== '')
}

export function reverseTwists(twists: string): string {
  return twists
    .split(' ')
    .map((twist) => {
      if (twist.endsWith('2')) return twist
      if (twist.endsWith("'")) return twist[0]
      return `${twist}'`
    })
    .reverse()
    .join(' ')
}

export function isSwappable(a: string, b: string): boolean {
  if (!a || !b) return false

  const alg = new Algorithm(`${a} ${b}`)
  return alg.twists[0] >>> 3 === alg.twists[1] >>> 3
}

export function isSameFace(a: string, b: string): boolean {
  if (!a || !b) return false
  return a.charAt(0) === b.charAt(0)
}

export function isRotation(a?: string): boolean {
  if (!a) return false
  return 'xyz'.includes(a.charAt(0))
}

export function centerLength(centerCycles: number, placement: number): number {
  return centerCycles === 3 ? 6 : centerCycles === 2 ? 4 : [2, 8, 10].includes(placement) ? 4 : 6
}

export function algLength(alg: string): number {
  return alg.split(' ').filter(a => a !== '').length
}

export function getCubieCube(cube: Cube): { corners: number[], edges: number[], placement: number }
export function getCubieCube(scramble: string): { corners: number[], edges: number[], placement: number }
export function getCubieCube(input: Cube | string): { corners: number[], edges: number[], placement: number } {
  const cube = typeof input === 'string' ? new Cube() : input
  if (typeof input === 'string') cube.twist(new Algorithm(input))

  return {
    corners: cube.getRawCorners(),
    edges: cube.getRawEdges(),
    placement: cube.placement,
  }
}
