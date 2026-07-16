import type { AxisKey } from './types'
import type { AxisIndex, CubeState } from '~/utils/fr/cube'

import {
  CORNER_CUBIES,
  EDGE_CUBIES,
  LOCS,
} from '~/utils/fr/cube'
import { AXIS_INDEX } from '~/utils/fr/types'

function stickerMatchesFace(state: CubeState, idx: number): boolean {
  return state[idx] === LOCS[idx]!.color
}

/** Edges on the slice perpendicular to the LS axis (E-slice for U/D, M-slice for R/L, S-slice for F/B). */
function isSliceEdge(coord: readonly [number, number, number], sliceAxis: AxisIndex): boolean {
  return coord[sliceAxis] === 0
}

/**
 * Leave Slice: all corners and all non-slice edges are solved; only the slice axis edges may differ.
 * The slice is determined by lsAxis: E-slice (ud), M-slice (rl), or S-slice (fb).
 */
function isLeaveSlice(state: CubeState, lsAxis: AxisKey = 'ud'): boolean {
  const sliceAxis = AXIS_INDEX[lsAxis]
  for (const cc of CORNER_CUBIES) {
    for (const si of cc.stickers) {
      if (!stickerMatchesFace(state, si))
        return false
    }
  }
  for (const ec of EDGE_CUBIES) {
    if (isSliceEdge(ec.coord, sliceAxis))
      continue
    for (const si of ec.stickers) {
      if (!stickerMatchesFace(state, si))
        return false
    }
  }
  return true
}

/** Whether state satisfies the Leave Slice goal for the given LS axis. */
export function isLeaveSliceGoal(state: CubeState, lsAxis: AxisKey = 'ud'): boolean {
  return isLeaveSlice(state, lsAxis)
}
