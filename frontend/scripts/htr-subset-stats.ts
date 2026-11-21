/**
 * Verify utils/htr-coset.ts against insertionfinder and print HTR subset statistics.
 *
 * - every coset: bad edges, corner subset and HTR-ness match getDRDescription,
 *   and the optimal solution really reaches HTR
 * - random DR states on all three axes: the reported solution reaches HTR with the optimal length
 *
 * Usage (in frontend/): npx jiti scripts/htr-subset-stats.ts
 */
import { Algorithm, Cube } from 'insertionfinder'

import { getDRDescription } from '../utils/cube'
import { getDRCosetInfo, getHTRCosetTable } from '../utils/htr-coset'

const AXIS_MOVES: Record<string, string[]> = {
  UD: ['U', 'U\'', 'U2', 'D', 'D\'', 'D2', 'R2', 'L2', 'F2', 'B2'],
  RL: ['R', 'R\'', 'R2', 'L', 'L\'', 'L2', 'U2', 'D2', 'F2', 'B2'],
  FB: ['F', 'F\'', 'F2', 'B', 'B\'', 'B2', 'U2', 'D2', 'R2', 'L2'],
}

function isHTR(algorithm: string) {
  const cube = new Cube()
  cube.twist(new Algorithm(algorithm))
  return cube.isHalfTurnReductionSolved()
}

function randomScramble(moves: string[], length: number) {
  return Array.from({ length }, () => moves[Math.floor(Math.random() * moves.length)]).join(' ')
}

function assert(condition: boolean, message: string) {
  if (!condition)
    throw new Error(message)
}

function main() {
  let t0 = Date.now()
  const t = getHTRCosetTable()
  console.log(`Built ${t.size} cosets in ${Date.now() - t0}ms`)

  t0 = Date.now()
  for (let coset = 0; coset < t.size; coset++) {
    const alg = t.pathTo(coset).join(' ')
    const d = getDRDescription(alg)
    const subset = t.cornerSubsets[t.cornerCoset[coset]]
    const expected = d.corners === 4 ? `4${d.cornerState.normal === 1 ? 'a' : 'b'}${d.qt}` : `${d.corners}c${d.qt}`
    assert(d.edges === t.badEdges[coset], `edges mismatch at ${coset}: ${alg}`)
    assert(subset === expected, `subset mismatch at ${coset}: ${alg} ${subset} vs ${expected}`)
    assert(d.htr === (t.distance[coset] === 0), `HTR mismatch at ${coset}: ${alg}`)
    assert(isHTR(`${alg} ${t.solve(coset).join(' ')}`), `solution fails at ${coset}: ${alg}`)
  }
  console.log(`Checked all cosets against insertionfinder in ${Date.now() - t0}ms`)

  for (const [axis, moves] of Object.entries(AXIS_MOVES)) {
    for (let i = 0; i < 300; i++) {
      const scramble = randomScramble(moves, 60)
      const info = getDRCosetInfo(scramble)
      assert(info !== null, `no coset for ${axis}: ${scramble}`)
      assert(isHTR(`${scramble} ${info!.solution.join(' ')}`), `${axis} solution fails: ${scramble}`)
      assert(info!.solution.length === t.distance[info!.coset], `${axis} length mismatch: ${scramble}`)
      const { niss } = info!
      const premoves = [...niss.inverse].reverse().map(m => m.endsWith('2') ? m : m.endsWith('\'') ? m[0] : `${m}'`)
      assert(isHTR(`${premoves.join(' ')} ${scramble} ${niss.normal.join(' ')}`), `${axis} NISS solution fails: ${scramble}`)
      assert(niss.length === niss.normal.length + niss.inverse.length && niss.length <= info!.solution.length, `${axis} NISS length mismatch: ${scramble}`)
    }
  }
  console.log('Checked random DR states on UD, RL and FB')

  const halfTurns = t.moves.map((m, i) => [m, i] as const).filter(([m]) => m.endsWith('2')).map(([, i]) => i)
  const subsetChanges = new Set<string>()
  for (let coset = 0; coset < t.size; coset++) {
    for (const move of halfTurns) {
      const a = t.cornerSubsets[t.cornerCoset[coset]]
      const b = t.cornerSubsets[t.cornerCoset[t.next(coset, move)]]
      if (a !== b)
        subsetChanges.add(`${a}->${b}`)
    }
  }
  console.log(`Half turns change corner subset: ${subsetChanges.size ? [...subsetChanges].join(', ') : 'never'}`)

  // U D' is an E-slice quarter turn plus a rotation: it swaps the roles of R/L and F/B colours,
  // mapping xc ye to (8-x)c (8-y)e. Only the HTR coset itself changes length (0 vs U D').
  const U = t.moves.indexOf('U')
  const Dp = t.moves.indexOf('D\'')
  let lengthChanges = 0
  for (let coset = 0; coset < t.size; coset++) {
    const mirror = t.next(t.next(coset, U), Dp)
    const a = t.cornerSubsets[t.cornerCoset[coset]]
    const b = t.cornerSubsets[t.cornerCoset[mirror]]
    const expected = a[1] === 'c' ? `${8 - Number(a[0])}c${a.slice(2)}` : a
    assert(b === expected, `U D' maps ${a} to ${b} at ${coset}`)
    assert(t.badEdges[mirror] === 8 - t.badEdges[coset], `U D' edges ${t.badEdges[coset]} -> ${t.badEdges[mirror]} at ${coset}`)
    if (t.distance[mirror] !== t.distance[coset])
      lengthChanges++
  }
  assert(lengthChanges === 2, `U D' changes optimal length on ${lengthChanges} cosets`)
  console.log('Checked xc ye = (8-x)c (8-y)e via U D\' on all cosets')

  const stats = new Map<string, number[]>()
  for (let coset = 0; coset < t.size; coset++) {
    const subset = t.cornerSubsets[t.cornerCoset[coset]]
    const list = stats.get(subset) ?? []
    list[t.distance[coset]] = (list[t.distance[coset]] ?? 0) + 1
    stats.set(subset, list)
  }
  console.log('\nOptimal HTR length by corner subset (cosets per length)')
  for (const [subset, list] of [...stats.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const total = list.reduce((s, n) => s + (n ?? 0), 0)
    const mean = list.reduce((s, n, d) => s + (n ?? 0) * d, 0) / total
    console.log(`  ${subset}  mean ${mean.toFixed(2)}  ${list.map((n, d) => n ? `${d}:${n}` : '').filter(Boolean).join(' ')}`)
  }
}

main()
