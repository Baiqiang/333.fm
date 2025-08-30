import { Algorithm, Cube } from 'insertionfinder'

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

// helper constants
const cornerFaceletsIndexes = [
  [0, 27, 47], // ULB
  [2, 20, 45], // URB
  [6, 29, 36], // ULF
  [8, 18, 38], // URF
  [9, 35, 42], // DLF
  [11, 24, 44], // DRF
  [15, 33, 53], // DLB
  [17, 26, 51], // DRB
]
const cornerLines: Record<number, Record<number, 'x' | 'y' | 'z'>> = {
  0: { 1: 'x', 2: 'z', 6: 'y' },
  1: { 0: 'x', 3: 'z', 7: 'y' },
  2: { 0: 'z', 3: 'x', 4: 'y' },
  3: { 1: 'z', 2: 'x', 5: 'y' },
  4: { 2: 'y', 5: 'x', 6: 'z' },
  5: { 3: 'y', 4: 'x', 7: 'z' },
  6: { 0: 'y', 4: 'z', 7: 'x' },
  7: { 1: 'y', 5: 'z', 6: 'x' },
}
const axisIndexes: Record<string, number> = {
  U: 0,
  D: 0,
  L: 1,
  R: 1,
  F: 2,
  B: 2,
}
const nonDRFacelets = {
  UD: {
    // edge facelets siblings of U face
    edges: [19, 25, 28, 34],
    facelets: ['R', 'L'],
  },
  RL: {
    // edge facelets siblings of L face
    edges: [3, 5, 12, 14],
    facelets: ['U', 'D'],
  },
  FB: {
    // edge facelets siblings of F face
    edges: [1, 7, 10, 16],
    facelets: ['U', 'D'],
  },
}

export function getDRDescription(algorithm: string) {
  const cube = new Cube()
  const description = {
    get state() {
      if (this.solved)
        return 'Solved'
      if (this.htr)
        return 'HTR'
      if (this.dr) {
        const base = `DR-${this.drStatus[0]}`
        const edges = `${this.edges}e`
        switch (this.corners) {
          case 0:
          case 8:
          case 2:
          case 6:
            return `${base} ${this.corners}c${this.qt} ${edges} ${this.fakeHTR ? ' Fake HTR' : ''}`
          case 4:
            return `${base} 4${this.cornerState.normal === 1 ? 'a' : 'b'}${this.qt} ${edges}`
        }
      }
      if (this.eo)
        return `EO-${this.eoStatus.join(',')}`
      return 'Unknown'
    },
    edges: 0,
    corners: 0,
    qt: 0,
    eo: false,
    eoStatus: [] as ('UD' | 'RL' | 'FB')[],
    dr: false,
    drStatus: [] as ('UD' | 'RL' | 'FB')[],
    htr: false,
    solved: false,
    fakeHTR: false,
    parity: false,
    cornerState: {
      normal: 0,
      inverse: 0,
    },
  }
  try {
    cube.twist(new Algorithm(algorithm))
  }
  catch {
    return description
  }
  if (!cube)
    return description
  const parity = cube.hasParity()
  description.parity = parity
  if (cube.isSolved()) {
    description.solved = true
  }
  if (cube.isHalfTurnReductionSolved()) {
    description.htr = true
  }
  const drStatus = cube.getDominoReductionStatus()
  const eoStatus = cube.getEdgeOrientationStatus()
  description.drStatus = drStatus
  description.eoStatus = eoStatus
  if (drStatus.length === 0 && eoStatus.length === 0) {
    return description
  }
  description.eo = true
  if (drStatus.length > 0) {
    description.dr = true
  }
  else {
    return description
  }
  // check DR subsets
  let corners = 0
  const badCorners: number[] = []
  const goodCorners: number[] = []
  const facelets = cube.toFaceletString()
  const faceletIndexes = nonDRFacelets[drStatus[0]]
  // check corners
  for (let i = 0; i < 8; i++) {
    const cornerIndexes = cornerFaceletsIndexes[i]
    if (cornerIndexes.some((ci, index) => axisIndexes[facelets[ci]] !== index)) {
      corners++
      badCorners.push(i)
    }
    else {
      goodCorners.push(i)
    }
  }
  let edges = 0
  for (const index of faceletIndexes.edges) {
    if (facelets[index] !== faceletIndexes.facelets[0] && facelets[index] !== faceletIndexes.facelets[1]) {
      edges++
    }
  }
  description.edges = edges * 2
  description.corners = corners
  let qt = 0
  switch (corners) {
    case 0:
    case 8:
      if (parity) {
        description.qt = 3
        break
      }
      // check corner HTR
      if ([0, 2, 6, 8].filter(i => facelets[i] === facelets[0]).length % 2 === 1) {
        qt = 4
      }
      if ([18, 20, 27, 29].filter(i => facelets[i] === facelets[18]).length % 2 === 1) {
        qt = 4
      }
      description.qt = qt
      description.fakeHTR = qt === 4
      break
    case 2:
    case 6:
      if (!parity) {
        description.qt = 4
      }
      else {
        const cornerFacelets: Record<string, number> = {}
        for (let i = 0; i < 4; i++) {
          let j = i
          // if it's a bad corner, use the other bad corner
          if ((corners === 6 ? goodCorners : badCorners).includes(i)) {
            j = (corners === 6 ? goodCorners : badCorners).find(c => c !== i)!
          }
          for (const index of cornerFaceletsIndexes[j]) {
            cornerFacelets[facelets[index]] = (cornerFacelets[facelets[index]] || 0) + 1
          }
        }
        // check if there is an odd number of corner facelets
        // if there is, then it's 3qt
        for (const count of Object.values(cornerFacelets)) {
          if (count % 2 === 1) {
            description.qt = 3
            break
          }
        }
        // otherwise it's 5qt
        if (description.qt === 0) {
          description.qt = 5
        }
      }
      break
    case 4:
    {
      // check in normal
      description.cornerState.normal = 2
      description.cornerState.inverse = 1
      const cornerFacelets: Record<string, number> = {}
      for (const badCorner of badCorners) {
        for (const index of cornerFaceletsIndexes[badCorner]) {
          cornerFacelets[facelets[index]] = (cornerFacelets[facelets[index]] || 0) + 1
        }
      }
      const first = badCorners[0]
      const second = badCorners.slice(1).find(c => cornerLines[first][c] !== undefined)!
      const rest = badCorners.filter(c => c !== first && c !== second)
      const firstLine = cornerLines[first][second]
      const secondLine = cornerLines[rest[0]][rest[1]]
      if (firstLine === secondLine) {
        description.cornerState.normal = 1
      }
      for (const count of Object.values(cornerFacelets)) {
        if (count % 2 === 1) {
          description.cornerState.inverse = 2
          break
        }
      }
      if (description.cornerState.normal === 1) {
        if (description.cornerState.inverse === 1) {
          description.qt = parity ? 1 : 2
        }
        else {
          description.qt = parity ? 3 : 4
        }
      }
      else {
        if (description.cornerState.inverse === 1) {
          description.qt = parity ? 3 : 4
        }
        else {
          description.qt = parity ? 5 : 2
        }
      }
    }
  }
  return description
}
