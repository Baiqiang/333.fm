export const DNF = 99999998
export const DNS = 99999999

export interface Rankable {
  rank: number
  [key: string]: any
}

export function formatResult(result: number, precision = 0): string {
  if (Number.isNaN(result)) return 'N/A'
  if (!result) return ''
  if (result === DNF) return 'DNF'
  if (result === DNS) return 'DNS'
  return (result / 100).toFixed(precision)
}

export function aoN(results: number[], n = 0, mean = false): number {
  if (n === 0) n = results.length
  if (results.length < n) return Number.NaN

  results = results.slice(-n)
  let total = results.reduce((a, b) => a + b, 0)
  if (!mean) {
    const best = Math.min(...results)
    const worst = Math.max(...results)
    total -= best + worst
    n -= 2
  }
  return Number((total / n).toFixed(2))
}

export function betterThan(a: number, b: number): boolean {
  if (a === DNF || a === DNS) return false
  return a < b
}

export function calculateMean(values: number[]): number {
  const dnfResults = values.filter(v => v === DNF)
  if (dnfResults.length > 0) return DNF
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length)
}

export function calculateTrimmedMean(values: number[], trimRatio = 0.05): number {
  const validValues = values.filter(v => v > 0 && v !== DNF && v !== DNS).sort((a, b) => a - b)
  if (validValues.length === 0) return DNF

  const trimCount = Math.ceil(validValues.length * trimRatio)
  const trimmedValues =
    validValues.length > trimCount * 2 ? validValues.slice(trimCount, validValues.length - trimCount) : validValues
  return Math.round(trimmedValues.reduce((a, b) => a + b, 0) / trimmedValues.length)
}

export function calculateAverage(values: number[]): number {
  const dnfResults = values.filter(v => v === DNF)
  if (dnfResults.length > 1) return DNF

  const max = Math.max(...values)
  const min = Math.min(...values)
  return Math.round((values.reduce((a, b) => a + b, 0) - max - min) / (values.length - 2))
}

export function sortResult<T extends { values: number[], average: number, best: number }>(a: T, b: T): number {
  const nonZeroValuesA = a.values.filter(value => value > 0)
  const nonZeroValuesB = b.values.filter(value => value > 0)
  if (nonZeroValuesA.length !== nonZeroValuesB.length) return nonZeroValuesB.length - nonZeroValuesA.length
  if (a.average === b.average) return a.best - b.best
  return a.average - b.average
}

export function setRanks<T extends Rankable & { values: number[], average: number, best: number }>(results: T[]): T[] {
  results.sort(sortResult)
  return setRanksOnly(results)
}

export function setRanksOnly<T extends Rankable>(results: T[], rankKeys: string[] = ['average', 'best']): T[] {
  results.forEach((result, index) => {
    const previous = results[index - 1]
    result.rank = index + 1
    if (previous && rankKeys.every(key => result[key] === previous[key])) {
      result.rank = previous.rank
    }
  })
  return results
}

export function groupBy<T extends Record<string, any>>(array: T[], key: string): T[] {
  const map: Record<string, boolean> = {}
  const grouped: T[] = []
  for (const item of array) {
    if (map[item[key]]) continue
    map[item[key]] = true
    grouped.push(item)
  }
  return grouped
}

export function getTopN<T extends Rankable>(results: T[], n: number, rankKeys: string[] = ['average', 'best']): T[] {
  setRanksOnly(results, rankKeys)
  if (results.length <= n) return results
  return results.filter(result => result.rank <= n)
}

export function getTopDistinctN<T extends Rankable & Record<string, any>>(
  results: T[] | Record<string, T>,
  n: number,
  rankKeys: string[] = ['average', 'best'],
  sortDesc = false,
  groupKey = 'userId',
): T[] {
  if (!Array.isArray(results)) results = Object.values(results)

  results.sort((a, b) => {
    for (const key of rankKeys) {
      if (a[key] > b[key]) return 1
      if (a[key] < b[key]) return -1
    }
    return 0
  })
  if (sortDesc) results.reverse()

  const ret = groupBy(results, groupKey)
  return getTopN(ret, n, rankKeys)
}
