import {
  cube333DRScramble,
  cube333EOScramble,
  cube333fmScramble,
  cube333HTRScramble,
  cube333JZPScramble,
} from 'twisty_puzzle_solver'

export enum ScrambleType {
  NORMAL,
  EO,
  DR,
  HTR,
  JZP,
}

export function generateScramble(type = ScrambleType.NORMAL, prefix = `R' U' F`, suffix = `R' U' F`): string {
  switch (type) {
    case ScrambleType.NORMAL:
      return cube333fmScramble()
    case ScrambleType.EO:
      return cube333EOScramble(prefix, suffix)
    case ScrambleType.DR:
      return cube333DRScramble(prefix, suffix)
    case ScrambleType.HTR:
      return cube333HTRScramble(prefix, suffix)
    case ScrambleType.JZP:
      return cube333JZPScramble(prefix, suffix)
    default:
      return cube333fmScramble()
  }
}

export function generateScrambles(number: number, type = ScrambleType.NORMAL): string[] {
  const scrambles: string[] = []
  for (let i = 0; i < number; i++) {
    scrambles.push(generateScramble(type))
  }
  return scrambles
}
