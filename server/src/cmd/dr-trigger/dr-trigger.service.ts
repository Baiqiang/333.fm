import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { createHash } from 'crypto'
import { readdirSync, readFileSync } from 'fs'
import { Algorithm } from 'insertionfinder'
import { join } from 'path'
import { Repository } from 'typeorm'

import { DRTriggers, DRTriggerSolution } from '@/entities/dr-triggers.entity'

const CSV_DIR = join(__dirname, '..', '..', '..', '..', 'drm_doc_dev', 'public')
const BATCH_SIZE = 500
const SYMMETRY_BATCH_SIZE = 2000
const MOVE_RE = /^([URFDLB])([2']?)$/
const MIRROR_FACE_MAP: Record<string, string> = {
  U: 'U',
  R: 'L',
  F: 'F',
  D: 'D',
  L: 'R',
  B: 'B',
}

interface SymmetryTransform {
  name: string
  rotation: string
  mirror: boolean
}

@Injectable()
export class DRTriggerCommandService {
  private readonly logger = new Logger(DRTriggerCommandService.name)

  constructor(
    @InjectRepository(DRTriggers)
    private readonly triggersRepository: Repository<DRTriggers>,
  ) {}

  async seed() {
    const files = readdirSync(CSV_DIR).filter(f => f.endsWith('_db_input.csv'))
    this.logger.log(`Found ${files.length} CSV files in ${CSV_DIR}`)

    let totalCases = 0
    let totalSolutions = 0

    for (const file of files) {
      const rzp = file.replace('_db_input.csv', '')
      const existing = await this.triggersRepository.count({ where: { rzp } })
      if (existing > 0) {
        this.logger.log(`Skipping ${file}: already has ${existing} cases`)
        totalCases += existing
        continue
      }

      const content = readFileSync(join(CSV_DIR, file), 'utf-8')
      const { cases, solutionCount } = this.parseCsv(content, rzp)

      if (cases.length === 0) {
        this.logger.warn(`No cases found in ${file}`)
        continue
      }

      for (let i = 0; i < cases.length; i += BATCH_SIZE) {
        const batch = cases.slice(i, i + BATCH_SIZE)
        await this.triggersRepository.save(batch)
      }

      totalCases += cases.length
      totalSolutions += solutionCount
      this.logger.log(`${file}: imported ${cases.length} cases, ${solutionCount} solutions`)
    }

    this.logger.log(`Done. Total: ${totalCases} cases, ${totalSolutions} solutions`)
  }

  async fixEoBreaking() {
    const total = await this.triggersRepository.count()
    this.logger.log(`Processing ${total} triggers...`)

    const batchSize = 500
    let updated = 0
    let eoCount = 0
    let eoOnlyCount = 0

    for (let offset = 0; offset < total; offset += batchSize) {
      const triggers = await this.triggersRepository.find({
        order: { id: 'ASC' },
        skip: offset,
        take: batchSize,
      })

      const toSave: DRTriggers[] = []
      for (const t of triggers) {
        const minLen = Math.min(...t.solutions.map(s => this.getSolutionMoveCount(s.solution)))
        const optimalSolutions = t.solutions.filter(s => this.getSolutionMoveCount(s.solution) === minLen)
        const hasEo = optimalSolutions.some(s => s.eoBreaking)
        const allEo = optimalSolutions.every(s => s.eoBreaking)

        if (t.eoBreaking !== hasEo || t.eoBreakingOnly !== allEo) {
          t.eoBreaking = hasEo
          t.eoBreakingOnly = allEo
          toSave.push(t)
          if (hasEo) eoCount++
          if (allEo) eoOnlyCount++
        }
      }

      if (toSave.length > 0) {
        await this.triggersRepository.save(toSave)
        updated += toSave.length
      }

      this.logger.log(`Processed ${Math.min(offset + batchSize, total)}/${total}`)
    }

    this.logger.log(`Done. Updated ${updated} triggers. eoBreaking: ${eoCount}, eoBreakingOnly: ${eoOnlyCount}`)
  }

  async reset() {
    const count = await this.triggersRepository.count()
    if (count === 0) {
      this.logger.log('No triggers to delete')
      return
    }
    await this.triggersRepository.clear()
    this.logger.log(`Deleted ${count} triggers`)
  }

  async printCountTable() {
    const rows = await this.triggersRepository
      .createQueryBuilder('t')
      .select('t.rzp', 'rzp')
      .addSelect('t.optimal_moves', 'optimalMoves')
      .addSelect('COUNT(*)', 'count')
      .groupBy('t.rzp')
      .addGroupBy('t.optimal_moves')
      .orderBy('t.rzp', 'ASC')
      .addOrderBy('t.optimal_moves', 'ASC')
      .getRawMany<{ rzp: string; optimalMoves: string; count: string }>()

    const moves = [...new Set(rows.map(row => Number(row.optimalMoves) / 100))].sort((a, b) => a - b)
    const byRzp = new Map<string, Map<number, number>>()

    for (const row of rows) {
      const rzp = row.rzp
      const move = Number(row.optimalMoves) / 100
      const count = Number(row.count)
      if (!byRzp.has(rzp)) {
        byRzp.set(rzp, new Map())
      }
      byRzp.get(rzp)!.set(move, count)
    }

    const header = ['rzp', ...moves.map(String), 'total']
    console.log(header.join('\t'))
    for (const rzp of [...byRzp.keys()].sort()) {
      const counts = byRzp.get(rzp)!
      const total = moves.reduce((sum, move) => sum + (counts.get(move) ?? 0), 0)
      const line = [rzp, ...moves.map(move => String(counts.get(move) ?? 0)), String(total)]
      console.log(line.join('\t'))
    }
  }

  async computeSymmetryGroups() {
    const symmetries = this.getSymmetryTransforms()
    const solutionCache = new Map<string, string[]>()

    let totalCases = 0
    let lastId = 0

    // Reset all symmetry data first
    await this.triggersRepository
      .createQueryBuilder()
      .update()
      .set({ symmetryGroup: null, isSymmetryRepresentative: false })
      .execute()

    while (true) {
      const triggers = await this.triggersRepository
        .createQueryBuilder('t')
        .where('t.id > :lastId', { lastId })
        .orderBy('t.id', 'ASC')
        .limit(SYMMETRY_BATCH_SIZE)
        .getMany()

      if (triggers.length === 0) break

      const toSave: DRTriggers[] = []
      for (const trigger of triggers) {
        lastId = trigger.id
        totalCases++

        const canonicalKey = this.computeCanonicalKey(trigger, symmetries, solutionCache)
        if (trigger.symmetryGroup !== canonicalKey) {
          trigger.symmetryGroup = canonicalKey
          toSave.push(trigger)
        }
      }

      if (toSave.length > 0) {
        for (let i = 0; i < toSave.length; i += BATCH_SIZE) {
          await this.triggersRepository.save(toSave.slice(i, i + BATCH_SIZE))
        }
      }

      this.logger.log(`Computed symmetry groups for ${totalCases} cases...`)
    }

    // Mark representatives: lowest id per symmetry group
    const groups = await this.triggersRepository
      .createQueryBuilder('t')
      .select('t.symmetryGroup', 'symmetryGroup')
      .addSelect('MIN(t.id)', 'minId')
      .where('t.symmetryGroup IS NOT NULL')
      .groupBy('t.symmetryGroup')
      .getRawMany<{ symmetryGroup: string; minId: number }>()

    const repIds = groups.map(g => Number(g.minId))
    for (let i = 0; i < repIds.length; i += BATCH_SIZE) {
      const batch = repIds.slice(i, i + BATCH_SIZE)
      await this.triggersRepository
        .createQueryBuilder()
        .update()
        .set({ isSymmetryRepresentative: true })
        .whereInIds(batch)
        .execute()
    }

    this.logger.log(
      `Done. ${totalCases} cases -> ${groups.length} symmetry groups. ${repIds.length} representatives marked.`,
    )
  }

  async analyzeSymmetry(maxMoves = 6) {
    const maxOptimalMoves = maxMoves * 100
    const symmetries = this.getSymmetryTransforms()
    const groupCounts = new Map<string, number>()
    const groupSamples = new Map<string, string>()
    const perMoveOriginal = new Map<number, number>()
    const perMoveUnique = new Map<number, Set<string>>()
    const solutionCache = new Map<string, string[]>()

    let totalCases = 0
    let lastId = 0

    while (true) {
      const triggers = await this.triggersRepository
        .createQueryBuilder('t')
        .where('t.optimal_moves <= :maxOptimalMoves', { maxOptimalMoves })
        .andWhere('t.id > :lastId', { lastId })
        .orderBy('t.id', 'ASC')
        .limit(SYMMETRY_BATCH_SIZE)
        .getMany()

      if (triggers.length === 0) {
        break
      }

      for (const trigger of triggers) {
        lastId = trigger.id
        totalCases++

        const canonicalKey = this.computeCanonicalKey(trigger, symmetries, solutionCache)

        groupCounts.set(canonicalKey, (groupCounts.get(canonicalKey) ?? 0) + 1)
        if (!groupSamples.has(canonicalKey)) {
          groupSamples.set(canonicalKey, `${trigger.id} (${trigger.rzp}#${trigger.caseId})`)
        }

        const moveCount = trigger.optimalMoves / 100
        perMoveOriginal.set(moveCount, (perMoveOriginal.get(moveCount) ?? 0) + 1)
        if (!perMoveUnique.has(moveCount)) {
          perMoveUnique.set(moveCount, new Set())
        }
        perMoveUnique.get(moveCount)!.add(canonicalKey)
      }

      this.logger.log(`Processed ${totalCases} cases...`)
    }

    this.logger.log('')
    this.logger.log(`Symmetries used: ${symmetries.length}`)
    this.logger.log(symmetries.map(symmetry => symmetry.name).join(' | '))
    this.logger.log(`Total cases (optimalMoves <= ${maxMoves}): ${totalCases}`)
    this.logger.log(`Unique after symmetry merge: ${groupCounts.size}`)
    this.logger.log(`Reduction: ${(100 - (groupCounts.size / totalCases) * 100).toFixed(2)}%`)
    this.logger.log('Per optimal length:')
    for (const moveCount of [...perMoveOriginal.keys()].sort((a, b) => a - b)) {
      const original = perMoveOriginal.get(moveCount)!
      const unique = perMoveUnique.get(moveCount)!.size
      this.logger.log(
        `  ${moveCount}: ${original} -> ${unique} (${(100 - (unique / original) * 100).toFixed(2)}% reduced)`,
      )
    }
    this.logger.log('Largest merged groups:')
    for (const [key, count] of [...groupCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20)) {
      this.logger.log(`  ${count} cases | sample ${groupSamples.get(key)} | ${key}`)
    }
  }

  async updateRepresentatives() {
    const FACE_PRIORITY: Record<string, number> = { R: 0, U: 1, F: 2, D: 3, B: 4, L: 5 }

    const groups = await this.triggersRepository
      .createQueryBuilder('t')
      .select('DISTINCT t.symmetryGroup', 'symmetryGroup')
      .where('t.symmetryGroup IS NOT NULL')
      .getRawMany<{ symmetryGroup: string }>()

    this.logger.log(`Found ${groups.length} symmetry groups`)

    // Reset all representatives
    await this.triggersRepository
      .createQueryBuilder()
      .update()
      .set({ isSymmetryRepresentative: false })
      .execute()

    const scoreSolution = (solution: string): number => {
      return solution
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .reduce((sum, move) => {
          const m = MOVE_RE.exec(move)
          return sum + (m ? (FACE_PRIORITY[m[1]] ?? 0) : 0)
        }, 0)
    }

    const scoreTrigger = (trigger: DRTriggers): { score: number; best: string } => {
      const minLen = Math.min(...trigger.solutions.map(s => this.getSolutionMoveCount(s.solution)))
      const optimalSolutions = trigger.solutions
        .filter(s => this.getSolutionMoveCount(s.solution) === minLen)
        .map(s => s.solution)
      let bestScore = Infinity
      let bestSol = ''
      for (const sol of optimalSolutions) {
        const s = scoreSolution(sol)
        if (s < bestScore || (s === bestScore && sol < bestSol)) {
          bestScore = s
          bestSol = sol
        }
      }
      return { score: bestScore, best: bestSol }
    }

    let updated = 0
    for (let i = 0; i < groups.length; i += BATCH_SIZE) {
      const batch = groups.slice(i, i + BATCH_SIZE)
      const groupKeys = batch.map(g => g.symmetryGroup)

      const triggers = await this.triggersRepository
        .createQueryBuilder('t')
        .where('t.symmetryGroup IN (:...groupKeys)', { groupKeys })
        .getMany()

      const byGroup = new Map<string, DRTriggers[]>()
      for (const t of triggers) {
        const list = byGroup.get(t.symmetryGroup!) ?? []
        list.push(t)
        byGroup.set(t.symmetryGroup!, list)
      }

      const repIds: number[] = []
      for (const members of byGroup.values()) {
        members.sort((a, b) => {
          const sa = scoreTrigger(a)
          const sb = scoreTrigger(b)
          if (sa.score !== sb.score) return sa.score - sb.score
          if (sa.best !== sb.best) return sa.best < sb.best ? -1 : 1
          return a.id - b.id
        })
        repIds.push(members[0].id)
      }

      for (let j = 0; j < repIds.length; j += BATCH_SIZE) {
        await this.triggersRepository
          .createQueryBuilder()
          .update()
          .set({ isSymmetryRepresentative: true })
          .whereInIds(repIds.slice(j, j + BATCH_SIZE))
          .execute()
      }

      updated += repIds.length
      this.logger.log(`Updated ${updated}/${groups.length} groups`)
    }

    this.logger.log(`Done. Updated representatives for ${updated} symmetry groups.`)
  }

  private computeCanonicalKey(
    trigger: DRTriggers,
    symmetries: SymmetryTransform[],
    solutionCache: Map<string, string[]>,
  ): string {
    const minLength = Math.min(...trigger.solutions.map(s => this.getSolutionMoveCount(s.solution)))
    const optimalSolutions = trigger.solutions
      .filter(s => this.getSolutionMoveCount(s.solution) === minLength)
      .map(s => this.normalizeAlgorithm(s.solution))

    let canonicalKey = ''
    for (let i = 0; i < symmetries.length; i++) {
      const hashes = new Set<string>()
      for (const solution of optimalSolutions) {
        let transformedHashes = solutionCache.get(solution)
        if (!transformedHashes) {
          transformedHashes = symmetries.map(symmetry => this.hash(this.transformSolution(solution, symmetry)))
          solutionCache.set(solution, transformedHashes)
        }
        hashes.add(transformedHashes[i])
      }
      const caseKey = this.hash([...hashes].sort().join('|'))
      if (!canonicalKey || caseKey < canonicalKey) {
        canonicalKey = caseKey
      }
    }

    return canonicalKey
  }

  private getSymmetryTransforms(): SymmetryTransform[] {
    const transforms: SymmetryTransform[] = []
    for (const useX2 of [false, true]) {
      for (const useY2 of [false, true]) {
        const rotation = [useX2 ? 'x2' : '', useY2 ? 'y2' : ''].filter(Boolean).join(' ')
        const rotationName = rotation || 'identity'
        transforms.push({ name: rotationName, rotation, mirror: false })
        transforms.push({ name: `${rotationName} + mirror`, rotation, mirror: true })
      }
    }
    return transforms
  }

  private transformSolution(solution: string, transform: SymmetryTransform) {
    const mirrored = transform.mirror ? this.mirrorSolution(solution) : solution
    return this.rotateSolution(mirrored, transform.rotation)
  }

  private rotateSolution(solution: string, rotation: string) {
    return this.normalizeAlgorithm([rotation, solution].filter(Boolean).join(' '))
  }

  private mirrorSolution(solution: string) {
    const moves = solution.trim().split(/\s+/).filter(Boolean)
    if (moves.length === 0) {
      return ''
    }

    const mirrored = moves.map(move => this.mirrorMove(move))
    const last = moves[moves.length - 1]
    const penultimate = moves[moves.length - 2]

    if (last === 'R' || last === 'L') {
      mirrored[mirrored.length - 1] = this.mirrorTailMove(last)
    }
    if (penultimate === 'R' && last === 'L') {
      mirrored[mirrored.length - 2] = this.mirrorTailMove(penultimate)
      mirrored[mirrored.length - 1] = this.mirrorTailMove(last)
    }

    return this.normalizeAlgorithm(mirrored.join(' '))
  }

  private mirrorMove(move: string) {
    const matched = MOVE_RE.exec(move)
    if (!matched) {
      throw new Error(`Unsupported move: ${move}`)
    }
    const [, face, suffix] = matched
    return `${MIRROR_FACE_MAP[face]}${this.invertSuffix(suffix)}`
  }

  private mirrorTailMove(move: string) {
    const matched = MOVE_RE.exec(move)
    if (!matched) {
      throw new Error(`Unsupported tail move: ${move}`)
    }
    return MIRROR_FACE_MAP[matched[1]]
  }

  private invertSuffix(suffix: string) {
    if (suffix === '2') {
      return suffix
    }
    return suffix === "'" ? '' : "'"
  }

  private normalizeAlgorithm(algorithm: string) {
    const alg = new Algorithm(algorithm)
    alg.clearFlags()
    alg.normalize()
    return alg.toString()
  }

  private hash(input: string) {
    return createHash('md5').update(input).digest('hex')
  }

  private getSolutionMoveCount(solution: string) {
    return solution.split(' ').filter(Boolean).length
  }

  private parseCsv(content: string, rzp: string): { cases: DRTriggers[]; solutionCount: number } {
    const lines = content.split('\n')
    const caseMap = new Map<number, DRTriggers>()
    const solutionsMap = new Map<number, DRTriggerSolution[]>()
    let solutionCount = 0

    for (const line of lines) {
      if (!line.trim()) continue
      const parts = line.split(',')

      if (parts[0] === 'case') {
        const caseId = parseInt(parts[1])
        const trigger = new DRTriggers()
        trigger.caseId = caseId
        trigger.rzp = rzp
        trigger.arm = parts[3] || ''
        trigger.pairs = parseInt(parts[4]) || 0
        trigger.tetrad = parts[5] || null
        trigger.corners = parts[6]?.trim() || null
        trigger.optimalMoves = 0
        trigger.solutions = []
        caseMap.set(caseId, trigger)
        solutionsMap.set(caseId, [])
      } else if (parts[0] === 'solution') {
        const caseId = parseInt(parts[1])
        const sol: DRTriggerSolution = {
          length: parseInt(parts[2]) || 0,
          eoBreaking: parts[3] === '1',
          trigger: parseInt(parts[4]) || 0,
          solution: parts[5]?.trim() || '',
        }
        if (!sol.solution) continue
        solutionsMap.get(caseId)?.push(sol)
        solutionCount++
      }
    }

    const cases: DRTriggers[] = []
    for (const [caseId, trigger] of caseMap) {
      const solutions = solutionsMap.get(caseId) || []
      if (solutions.length === 0) continue
      trigger.solutions = solutions
      const minLen = Math.min(...solutions.map(s => this.getSolutionMoveCount(s.solution)))
      trigger.optimalMoves = minLen * 100
      const optSols = solutions.filter(s => this.getSolutionMoveCount(s.solution) === minLen)
      trigger.eoBreaking = optSols.some(s => s.eoBreaking)
      trigger.eoBreakingOnly = optSols.every(s => s.eoBreaking)
      cases.push(trigger)
    }

    return { cases, solutionCount }
  }
}
