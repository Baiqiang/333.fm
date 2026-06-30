import type { AxisClassification, CornerLabel, EdgeLabel } from './types'
import {
  type AxisIndex,
  colorAxis,
  cornersOf,
  type CubeState,
  type CubieView,
  edgesOf,
  faceByAxisSign,
  LOCS,
} from './cube'

/**
 * HTR state check: each sticker's color axis must match the axis of its face.
 * This also ensures correct corner/edge orientation and no middle-layer edge swaps (necessary for G3).
 */
export function isHtrState(state: CubeState): boolean {
  for (let i = 0; i < 54; i++) {
    const normal = LOCS[i].normal
    const faceAxis = normal.findIndex(v => v !== 0) as AxisIndex
    if (colorAxis(state[i]) !== faceAxis)
      return false
  }
  return true
}

/** Whether the axis satisfies FR shape: 0 bad edges and 0 corner shape (may be true FR or false FR). */
export function isFrShape(state: CubeState, axis: AxisIndex): boolean {
  const c = classifyAxis(state, axis)
  return c.badCount === 0 && c.cornerLabel === '0'
}

function sideSticker(edge: CubieView, axis: AxisIndex) {
  const s = edge.colors.find(c => c.normal[axis] === 0)
  if (!s)
    throw new Error('edge side sticker missing')
  return s
}

/** Grouping key from an edge's two non-axial colors (sorted and concatenated) as a "pillar". */
function cornerSideKey(corner: CubieView, axis: AxisIndex): string {
  return corner.colors
    .filter(c => c.normal[axis] === 0)
    .map(c => c.color)
    .sort()
    .join('')
}

export function classifyAxis(
  state: CubeState,
  axis: AxisIndex,
): AxisClassification {
  const sideAxes = ([0, 1, 2] as AxisIndex[]).filter(a => a !== axis)

  // ---- Bad edges ----
  const edges = edgesOf(state)
  const layerEdges = edges.filter(e => e.coord[axis] !== 0)
  const badTopEdges: CubieView[] = []
  const badBottomEdges: CubieView[] = []
  for (const e of layerEdges) {
    const side = sideSticker(e, axis)
    const sAxis = side.normal.findIndex(v => v !== 0) as AxisIndex
    const faceLetter = faceByAxisSign(sAxis, side.normal[sAxis])
    if (side.color !== faceLetter) {
      if (e.coord[axis] === 1)
        badTopEdges.push(e)
      else badBottomEdges.push(e)
    }
  }
  const badTop = badTopEdges.length
  const badBottom = badBottomEdges.length
  const badCount = badTop + badBottom

  let edgeLabel: EdgeLabel
  if (badCount === 0) {
    edgeLabel = '0bad'
  }
  else if (badCount === 2) {
    edgeLabel = '2bad'
  }
  else if (badCount === 6) {
    edgeLabel = '6bad'
  }
  else if (badCount === 8) {
    edgeLabel = '8bad'
  }
  else {
    // badCount === 4
    const hi = Math.max(badTop, badBottom)
    if (hi === 4) {
      edgeLabel = '4-0'
    }
    else if (hi === 3) {
      edgeLabel = '3-1'
    }
    else {
      // 2-2: same-layer bad edges on opposite side axes (o) vs adjacent (a)
      const pair = badTop === 2 ? badTopEdges : badBottomEdges
      const a0 = sideSticker(pair[0], axis).normal.findIndex(v => v !== 0)
      const a1 = sideSticker(pair[1], axis).normal.findIndex(v => v !== 0)
      edgeLabel = a0 === a1 ? '2-2o' : '2-2a'
    }
  }

  // ---- Corner shape ----
  const corners = cornersOf(state)
  const groups = new Map<string, CubieView[]>()
  for (const cor of corners) {
    const k = cornerSideKey(cor, axis)
    const arr = groups.get(k) ?? []
    arr.push(cor)
    groups.set(k, arr)
  }

  let cornerLabel: CornerLabel
  const sameLayerGroup = [...groups.values()].find(
    g => g.filter(c => c.coord[axis] === 1).length !== 1,
  )
  if (sameLayerGroup) {
    const [a, b] = sameLayerGroup
    let sharedAxis: AxisIndex = sideAxes[0]
    for (const sa of sideAxes) {
      if (a.coord[sa] === b.coord[sa])
        sharedAxis = sa
    }
    const faceLetter = faceByAxisSign(sharedAxis, a.coord[sharedAxis])
    cornerLabel
      = faceLetter === 'R' || faceLetter === 'L'
        ? '2RL'
        : faceLetter === 'F' || faceLetter === 'B'
          ? '2FB'
          : '2UD'
  }
  else {
    // All corners split top/bottom: same side colors in each column -> 0, else 1
    const colMap = new Map<string, CubieView[]>()
    for (const cor of corners) {
      const ck = sideAxes.map(sa => cor.coord[sa]).join(',')
      const arr = colMap.get(ck) ?? []
      arr.push(cor)
      colMap.set(ck, arr)
    }
    let allPillars = true
    for (const col of colMap.values()) {
      if (cornerSideKey(col[0], axis) !== cornerSideKey(col[1], axis))
        allPillars = false
    }
    cornerLabel = allPillars ? '0' : '1'
  }

  return { edgeLabel, cornerLabel, badCount, badTop, badBottom }
}
