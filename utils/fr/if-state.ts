import type { Cube } from 'insertionfinder'

import { getFaceletPositions } from '~/utils/cube'

import { LOCS, type CubeState } from './cube'

/** Map FR sticker indices to insertionfinder facelet indices (same physical sticker). */
const FR_TO_IF_FACELET = buildFrToIfFaceletMap()

function buildFrToIfFaceletMap(): number[] {
  const ifPos = getFaceletPositions()
  return LOCS.map((l) => {
    const [x, y, z] = l.coord
    const [nx, ny, nz] = l.normal
    const matches = ifPos.filter(p => p.x === x && p.y === y && p.z === z)
    const match = matches.find((p) => {
      if (p.axis === 'x')
        return nx !== 0
      if (p.axis === 'y')
        return ny !== 0
      return nz !== 0
    })
    if (!match)
      throw new Error('FR to insertionfinder facelet map failed')
    return match.i
  })
}

/** Convert an insertionfinder cube into the FR trainer sticker model. */
export function cubeStateFromInsertionfinder(cube: Cube): CubeState {
  const facelet = cube.toFaceletString()
  return FR_TO_IF_FACELET.map(i => facelet[i]) as CubeState
}
