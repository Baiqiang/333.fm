<script setup lang="ts">
const { t, locale } = useI18n()
const colorMode = useColorMode()
const user = inject(SYMBOL_USER)!
const config = useRuntimeConfig().public
const { data } = await useFetch<WCAResult[]>(`${config.wca.apiBaseURL}/persons/${user.value.wcaId}/results?event_id=333fm`)
const { data: competitionsData } = await useFetch<WCACompetition[]>(`${config.wca.apiBaseURL}/persons/${user.value.wcaId}/competitions`)
const fmResults = data.value || []
const competitions = competitionsData.value || []
const competitionMap = new Map(competitions.map(competition => [competition.id, competition]))
const competitionDateMap = new Map(competitions.map(competition => [
  competition.id,
  {
    start: Date.parse(competition.start_date),
    end: Date.parse(competition.end_date),
  },
]))
const roundPriorityMap: Record<string, number> = {
  0: 0,
  1: 1,
  d: 1.5,
  2: 2,
  e: 2.5,
  3: 3,
  g: 3.5,
  f: 10,
  c: 10.5,
  b: 11,
}

function compareWcaResultsDesc(a: WCAResult, b: WCAResult) {
  const dateA = competitionDateMap.get(a.competition_id)
  const dateB = competitionDateMap.get(b.competition_id)
  const endDiff = (dateB?.end ?? 0) - (dateA?.end ?? 0)
  if (endDiff !== 0)
    return endDiff
  const startDiff = (dateB?.start ?? 0) - (dateA?.start ?? 0)
  if (startDiff !== 0)
    return startDiff
  const roundDiff = (roundPriorityMap[b.round_type_id] ?? 5) - (roundPriorityMap[a.round_type_id] ?? 5)
  if (roundDiff !== 0)
    return roundDiff
  return 0
}

const fmResultsByCompetitionDateDesc = fmResults.slice().sort(compareWcaResultsDesc)
const competitionMeta = Object.fromEntries(
  (() => {
    const competitionIds = [...new Set(fmResultsByCompetitionDateDesc.map(result => result.competition_id))]
    return competitionIds.map((competitionId, index) => {
      const competition = competitionMap.get(competitionId)
      const date = !competition
        ? ''
        : competition.start_date === competition.end_date
          ? competition.start_date
          : `${competition.start_date} ~ ${competition.end_date}`
      return [competitionId, {
        index: competitionIds.length - index,
        date,
      }]
    })
  })(),
) as Record<string, { index: number, date: string }>

function getCompetitionDateLabel(competitionId?: string) {
  if (!competitionId)
    return ''
  return competitionMeta[competitionId]?.date || ''
}

const dateBounds = (() => {
  const starts: string[] = []
  const ends: string[] = []
  for (const result of fmResults) {
    const competition = competitionMap.get(result.competition_id)
    if (!competition)
      continue
    starts.push(competition.start_date)
    ends.push(competition.end_date)
  }
  return {
    min: starts.length ? starts.reduce((a, b) => (a < b ? a : b)) : '',
    max: ends.length ? ends.reduce((a, b) => (a > b ? a : b)) : '',
  }
})()

const chartSettings = useLocalStorage('profile.wca.chartSettings', {
  expanded: false,
  includeDNF: true,
  trimPercent: 5,
  rangeMode: 'time' as 'time' | 'attempt',
  startDate: '',
  endDate: '',
  recentAttemptCount: null as number | null,
  attemptStartIndex: 1,
  attemptEndIndex: null as number | null,
  fillCounts: true,
}, {
  initOnMounted: true,
  mergeDefaults: true,
})

const DAY_MS = 86400000
const minMs = dateBounds.min ? Date.parse(dateBounds.min) : 0
const maxMs = dateBounds.max ? Date.parse(dateBounds.max) : 0

function toDateStr(ms: number) {
  const date = new Date(ms)
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}

const rangeStartMs = computed<number>({
  get: () => (chartSettings.value.startDate ? Date.parse(chartSettings.value.startDate) : minMs),
  set: (value) => {
    chartSettings.value.rangeMode = 'time'
    chartSettings.value.recentAttemptCount = null
    const currentEnd = chartSettings.value.endDate ? Date.parse(chartSettings.value.endDate) : maxMs
    const clamped = Math.min(Math.max(value, minMs), currentEnd)
    chartSettings.value.startDate = clamped <= minMs ? '' : toDateStr(clamped)
  },
})
const rangeEndMs = computed<number>({
  get: () => (chartSettings.value.endDate ? Date.parse(chartSettings.value.endDate) : maxMs),
  set: (value) => {
    chartSettings.value.rangeMode = 'time'
    chartSettings.value.recentAttemptCount = null
    const currentStart = chartSettings.value.startDate ? Date.parse(chartSettings.value.startDate) : minMs
    const clamped = Math.max(Math.min(value, maxMs), currentStart)
    chartSettings.value.endDate = clamped >= maxMs ? '' : toDateStr(clamped)
  },
})

const rangeTrack = computed(() => {
  const total = maxMs - minMs || 1
  return {
    left: `${((rangeStartMs.value - minMs) / total) * 100}%`,
    right: `${((maxMs - rangeEndMs.value) / total) * 100}%`,
  }
})

function setRangeMonths(months: number | null) {
  chartSettings.value.rangeMode = 'time'
  chartSettings.value.recentAttemptCount = null
  if (months == null) {
    chartSettings.value.startDate = ''
    chartSettings.value.endDate = ''
    return
  }
  const start = new Date(maxMs)
  start.setMonth(start.getMonth() - months)
  chartSettings.value.startDate = toDateStr(Math.max(start.getTime(), minMs))
  chartSettings.value.endDate = ''
}

function setRangeMode(mode: 'time' | 'attempt') {
  chartSettings.value.rangeMode = mode
  chartSettings.value.recentAttemptCount = null
  if (mode === 'attempt') {
    chartSettings.value.startDate = ''
    chartSettings.value.endDate = ''
  }
}

interface MixedChartAttempt {
  // index: number
  moves: number
  roundTypeId: string
  attemptIndex: number
  competitionId: string
  competitionName: string
  resultKey: string
  resultAverage: number
  resultAttemptCount: number
}

type NumericCountChartPoint = [number, number]
type CountChartPoint = [number | 'DNF', number]

const derived = computed(() => {
  const start = chartSettings.value.startDate
  const end = chartSettings.value.endDate
  const inRange = (competitionId: string) => {
    const competition = competitionMap.get(competitionId)
    if (!competition)
      return false
    return (!start || competition.end_date >= start) && (!end || competition.start_date <= end)
  }
  const resultsDesc = fmResultsByCompetitionDateDesc.filter(result => inRange(result.competition_id))
  const resultsAsc = resultsDesc.slice().reverse()

  const singles: Record<number, [string, number][]> = {}
  const movesCountMap: Record<number, number> = {}
  const meansCountMap: Record<number, number> = {}
  let dnfMovesCount = 0
  let dnfMeansCount = 0
  const allSingles: number[] = []
  for (const result of resultsDesc) {
    const mean = result.average
    if (mean > 0)
      meansCountMap[mean] = (meansCountMap[mean] || 0) + 1
    else if (mean === WCA_DNF)
      dnfMeansCount++
    for (const [index, moves] of result.attempts.entries()) {
      if (moves > 0) {
        const scrambleNumber = index + 1
        singles[scrambleNumber] = singles[scrambleNumber] || []
        singles[scrambleNumber].push([result.competition_id, moves])
        movesCountMap[moves] = (movesCountMap[moves] || 0) + 1
        allSingles.push(moves)
      }
      else if (moves === WCA_DNF) {
        dnfMovesCount++
      }
    }
  }

  const allAttempts: MixedChartAttempt[] = resultsAsc.flatMap((result) => {
    const resultAttemptCount = result.attempts.filter(moves => moves > 0 || moves === WCA_DNF).length
    return result.attempts
      .map((moves, index) => ({
        moves,
        roundTypeId: result.round_type_id,
        attemptIndex: index + 1,
        competitionId: result.competition_id,
        competitionName: competitionMap.get(result.competition_id)?.name || result.competition_id,
        resultKey: `${result.competition_id}:${result.round_type_id}`,
        resultAverage: result.average,
        resultAttemptCount,
      }))
      .filter(({ moves }) => moves > 0 || moves === WCA_DNF)
  })
  const nonDNFAttempts = allAttempts.filter(attempt => attempt.moves > 0)

  const movesCount: NumericCountChartPoint[] = Object.entries(movesCountMap).map(([m, count]) => [Number(m), count])
  movesCount.sort((a, b) => a[0] - b[0])
  const meansCount: NumericCountChartPoint[] = Object.entries(meansCountMap).map(([m, count]) => [Number(m), count])
  meansCount.sort((a, b) => a[0] - b[0])

  const meanChartData = resultsAsc.map((result, index) => ({
    ...result,
    xIndex: index,
  }))
  const meanChartDataMap = new Map(meanChartData.map(result => [result.xIndex, result]))

  return {
    allAttempts,
    nonDNFAttempts,
    allSingles,
    minSingle: allSingles.length ? Math.min(...allSingles) : 0,
    maxSingle: allSingles.length ? Math.max(...allSingles) : 0,
    movesCount,
    meansCount,
    dnfMovesCount,
    dnfMeansCount,
    meanChartData,
    meanChartDataMap,
  }
})

function fillSingleCounts(counts: NumericCountChartPoint[]) {
  if (counts.length < 2)
    return counts
  const countMap = new Map(counts.map(([single, count]) => [single, count]))
  const min = counts[0][0]
  const max = counts[counts.length - 1][0]
  const filled: NumericCountChartPoint[] = []
  for (let single = min; single <= max; single++)
    filled.push([single, countMap.get(single) || 0])
  return filled
}

function fillMeanCounts(counts: NumericCountChartPoint[]) {
  if (counts.length < 2)
    return counts
  // Means are total/3 (stored as centi-moves), so iterate by 1/3-move steps.
  const countByTotal = new Map(counts.map(([mean, count]) => [Math.round(mean * 3 / 100), count]))
  const totals = [...countByTotal.keys()]
  const min = Math.min(...totals)
  const max = Math.max(...totals)
  const filled: NumericCountChartPoint[] = []
  for (let total = min; total <= max; total++)
    filled.push([Math.round(total * 100 / 3), countByTotal.get(total) || 0])
  return filled
}

function appendDNFCount(counts: NumericCountChartPoint[], count: number): CountChartPoint[] {
  if (!chartSettings.value.includeDNF || count <= 0)
    return counts
  return [...counts, ['DNF', count]]
}

function getCountChartTotal(counts: CountChartPoint[]) {
  return counts.reduce((total, [, count]) => total + count, 0)
}

function toChartValue(value: number) {
  return Number.isNaN(value) ? null : value
}

function trimmedAverage(results: number[], requiredCount: number, trimCount: number) {
  const normalizedTrimCount = Math.max(0, Math.floor(trimCount))
  if (results.length < requiredCount || results.length <= normalizedTrimCount * 2)
    return Number.NaN

  const sorted = results.slice().sort((a, b) => {
    if (a === WCA_DNF)
      return b === WCA_DNF ? 0 : 1
    if (b === WCA_DNF)
      return -1
    return a - b
  })
  const trimmed = sorted.slice(normalizedTrimCount, sorted.length - normalizedTrimCount)
  if (!trimmed.length || trimmed.includes(WCA_DNF))
    return Number.NaN

  const total = trimmed.reduce((sum, result) => sum + result, 0)
  return Number((total / trimmed.length).toFixed(2))
}

const availableAttempts = computed(() => chartSettings.value.includeDNF ? derived.value.allAttempts : derived.value.nonDNFAttempts)

function setRecentAttemptCount(count: number) {
  chartSettings.value.rangeMode = 'attempt'
  chartSettings.value.startDate = ''
  chartSettings.value.endDate = ''
  chartSettings.value.recentAttemptCount = count
  const end = availableAttempts.value.length
  chartSettings.value.attemptStartIndex = Math.max(1, end - count + 1)
  chartSettings.value.attemptEndIndex = null
}

function setAllAttemptsRange() {
  chartSettings.value.rangeMode = 'attempt'
  chartSettings.value.startDate = ''
  chartSettings.value.endDate = ''
  chartSettings.value.recentAttemptCount = null
  chartSettings.value.attemptStartIndex = 1
  chartSettings.value.attemptEndIndex = null
}

const attemptRangeStart = computed<number>({
  get: () => {
    const max = Math.max(availableAttempts.value.length, 1)
    return Math.min(Math.max(chartSettings.value.attemptStartIndex || 1, 1), max)
  },
  set: (value) => {
    chartSettings.value.rangeMode = 'attempt'
    chartSettings.value.recentAttemptCount = null
    const max = Math.max(availableAttempts.value.length, 1)
    const currentEnd = chartSettings.value.attemptEndIndex || max
    chartSettings.value.attemptStartIndex = Math.min(Math.max(value, 1), currentEnd)
  },
})

const attemptRangeEnd = computed<number>({
  get: () => {
    const max = Math.max(availableAttempts.value.length, 1)
    return Math.max(Math.min(chartSettings.value.attemptEndIndex || max, max), attemptRangeStart.value)
  },
  set: (value) => {
    chartSettings.value.rangeMode = 'attempt'
    chartSettings.value.recentAttemptCount = null
    const max = Math.max(availableAttempts.value.length, 1)
    const clamped = Math.max(Math.min(value, max), attemptRangeStart.value)
    chartSettings.value.attemptEndIndex = clamped >= max ? null : clamped
  },
})

const attemptRangeCount = computed(() => attemptRangeEnd.value - attemptRangeStart.value + 1)

const attemptRangeTrack = computed(() => {
  const max = Math.max(availableAttempts.value.length, 1)
  const total = max - 1 || 1
  return {
    left: `${((attemptRangeStart.value - 1) / total) * 100}%`,
    right: `${((max - attemptRangeEnd.value) / total) * 100}%`,
  }
})

const sourceAttempts = computed(() => {
  const attempts = availableAttempts.value
  if (chartSettings.value.rangeMode !== 'attempt')
    return attempts
  return attempts.slice(attemptRangeStart.value - 1, attemptRangeEnd.value)
})

function buildMoveCountChartData(attempts: MixedChartAttempt[]) {
  const countMap = new Map<number, number>()
  let dnfCount = 0
  for (const attempt of attempts) {
    if (attempt.moves > 0)
      countMap.set(attempt.moves, (countMap.get(attempt.moves) || 0) + 1)
    else if (attempt.moves === WCA_DNF)
      dnfCount++
  }
  const counts: NumericCountChartPoint[] = [...countMap.entries()].sort((a, b) => a[0] - b[0])
  return appendDNFCount(chartSettings.value.fillCounts ? fillSingleCounts(counts) : counts, dnfCount)
}

function buildMeanCountChartData(attempts: MixedChartAttempt[]) {
  const resultMap = new Map<string, {
    average: number
    attemptCount: number
    selectedCount: number
  }>()
  for (const attempt of attempts) {
    const item = resultMap.get(attempt.resultKey)
    if (item) {
      item.selectedCount++
    }
    else {
      resultMap.set(attempt.resultKey, {
        average: attempt.resultAverage,
        attemptCount: attempt.resultAttemptCount,
        selectedCount: 1,
      })
    }
  }

  const countMap = new Map<number, number>()
  let dnfCount = 0
  for (const item of resultMap.values()) {
    if (item.selectedCount !== item.attemptCount)
      continue
    if (item.average > 0)
      countMap.set(item.average, (countMap.get(item.average) || 0) + 1)
    else if (item.average === WCA_DNF)
      dnfCount++
  }

  const counts: NumericCountChartPoint[] = [...countMap.entries()].sort((a, b) => a[0] - b[0])
  return appendDNFCount(chartSettings.value.fillCounts ? fillMeanCounts(counts) : counts, dnfCount)
}

function buildSingleSeries(sourceAttempts: MixedChartAttempt[]) {
  return sourceAttempts.map((attempt, index) => [index, attempt.moves === WCA_DNF ? null : attempt.moves])
}

function buildAverageSeries(sourceAttempts: MixedChartAttempt[], n: number, trimCount: number) {
  const sourceValues = sourceAttempts.map(attempt => attempt.moves)
  return sourceAttempts.map((attempt, index) => [
    index,
    toChartValue(trimmedAverage(sourceValues.slice(index - n + 1, index + 1), n, trimCount)),
  ])
}

function buildCumulativeAverageSeries(sourceAttempts: MixedChartAttempt[], trimPercent: number) {
  const normalizedPercent = Math.max(0, Math.min(49, Number(trimPercent) || 0))
  const sourceValues = sourceAttempts.map(attempt => attempt.moves)
  return sourceAttempts.map((attempt, index) => {
    const currentValues = sourceValues.slice(0, index + 1)
    const trimCount = Math.ceil(currentValues.length * normalizedPercent / 100)
    return [
      index,
      toChartValue(trimmedAverage(currentValues, 1, trimCount)),
    ]
  })
}

function formatMixedSeriesTooltipValue(seriesName: string, value: number | null | undefined) {
  if (value == null)
    return '-'
  return formatWCAResult(value, seriesName === t('result.single') ? 0 : 2, 1)
}

function getTooltipAverageStatus(results: number[], requiredCount: number, trimCount: number) {
  const normalizedTrimCount = Math.max(0, Math.floor(trimCount))
  if (results.length < requiredCount || results.length <= normalizedTrimCount * 2)
    return '-'
  return Number.isNaN(trimmedAverage(results, requiredCount, trimCount)) ? 'DNF' : null
}

function getAverageTrimCount(n: number, trimPercent: number) {
  const normalizedPercent = Math.max(0, Math.min(49, Number(trimPercent) || 0))
  return Math.ceil(n * normalizedPercent / 100)
}

function getMixedAverageSeriesConfig(trimPercent: number) {
  return {
    Mo3: { n: 3, trimCount: 0 },
    Mo6: { n: 6, trimCount: 0 },
    Ao5: { n: 5, trimCount: getAverageTrimCount(5, trimPercent) },
    Ao12: { n: 12, trimCount: getAverageTrimCount(12, trimPercent) },
    Ao50: { n: 50, trimCount: getAverageTrimCount(50, trimPercent) },
    Ao100: { n: 100, trimCount: getAverageTrimCount(100, trimPercent) },
  } as const
}

function getBestAverageValue(sourceAttempts: MixedChartAttempt[], n: number, trimCount: number) {
  const values = buildAverageSeries(sourceAttempts, n, trimCount)
    .map(([, value]) => value)
    .filter((value): value is number => value != null)
  if (!values.length)
    return null
  return Math.min(...values)
}

const mixedBestAverages = computed(() => {
  const averageSeriesConfig = getMixedAverageSeriesConfig(chartSettings.value.trimPercent)
  const source = sourceAttempts.value
  const items = Object.entries(averageSeriesConfig).map(([label, config]) => ({
    label,
    value: getBestAverageValue(source, config.n, config.trimCount),
  }))
  const bestMean = buildCumulativeAverageSeries(source, chartSettings.value.trimPercent)
    .map(([, value]) => value)
    .filter((value): value is number => value != null)
  items.push({
    label: t('result.mean'),
    value: bestMean.length ? Math.min(...bestMean) : null,
  })
  return items
})

const meanChartOption = computed<ECOption>(() => ({
  title: {
    text: `${localeName(user.value.name, locale.value)} - WCA`,
  },
  tooltip: {
    trigger: 'axis',
    formatter: (params: any) => {
      const items = Array.isArray(params) ? params : [params]
      const axisValue = Number(items[0]?.axisValue ?? items[0]?.name)
      const result = derived.value.meanChartDataMap.get(axisValue)
      const title = result
        ? [
            result.competition_id,
            t(`result.roundType.${result.round_type_id}`),
            getCompetitionDateLabel(result.competition_id),
          ].join('<br>')
        : (items[0]?.axisValueLabel || items[0]?.name || '')
      const lines = items.map((item: any) => {
        const value = Array.isArray(item.value) ? item.value[1] : item.value
        return `${item.marker}${item.seriesName}: ${formatResult(value * 100, 2)}`
      })
      return [title, ...lines].join('<br>')
    },
  },
  toolbox: {
    feature: {
      saveAsImage: {
        name: `${localeName(user.value.name, locale.value)}-WCA.png`,
        title: t('common.saveAsImage'),
      },
    },
  },
  dataZoom: [
    {
      type: 'inside',
      xAxisIndex: [0],
    },
    {
      type: 'slider',
      xAxisIndex: [0],
      bottom: '7%',
    },
  ],
  xAxis: {
    type: 'category',
    data: derived.value.meanChartData.map(item => item.xIndex),
    boundaryGap: true,
    axisLabel: {
      formatter: (value: string | number) => {
        const result = derived.value.meanChartData[Number(value) - 1]
        if (!result)
          return ''
        const previous = derived.value.meanChartData[Number(value) - 2]
        return previous?.competition_id === result.competition_id ? '' : result.competition_id
      },
    },
  },
  yAxis: {
    type: 'value',
    min: derived.value.minSingle - 2 / 3,
    max: derived.value.maxSingle + 2 / 3,
    axisLabel: {
      formatter: (value: number) => formatResult(Math.floor(value * 300) / 3, 2),
    },
  },
  legend: {
    bottom: '0%',
  },
  grid: {
    left: '20px',
    right: '40px',
    containLabel: true,
  },
  series: [
    {
      name: t('result.mean'),
      showSymbol: false,
      type: 'line',
      data: derived.value.meanChartData
        .filter(r => r.average > 0)
        .map(r => [r.xIndex, formatResult(r.average, 2)]),
      zlevel: 10,
    },
    {
      name: 'A1',
      showSymbol: false,
      type: 'line',
      data: derived.value.meanChartData
        .filter(result => result.attempts[0] > 0)
        .map(result => [result.xIndex, result.attempts[0]]),
    },
    {
      name: 'A2',
      showSymbol: false,
      type: 'line',
      data: derived.value.meanChartData
        .filter(result => result.attempts[1] > 0)
        .map(result => [result.xIndex, result.attempts[1]]),
    },
    {
      name: 'A3',
      showSymbol: false,
      type: 'line',
      data: derived.value.meanChartData
        .filter(result => result.attempts[2] > 0)
        .map(result => [result.xIndex, result.attempts[2]]),
    },
  ],
}))
const movesCountOption = computed<ECOption>(() => {
  const data = buildMoveCountChartData(sourceAttempts.value)
  return {
    title: {
      text: `${localeName(user.value.name, locale.value)} - WCA`,
      subtext: `${t('common.total')}: ${getCountChartTotal(data)}`,
    },
    tooltip: {
      trigger: 'axis',
    },
    toolbox: {
      feature: {
        saveAsImage: {
          name: `${localeName(user.value.name, locale.value)}-WCA.png`,
          title: t('common.saveAsImage'),
        },
      },
    },
    legend: {
      bottom: '0%',
    },
    grid: {
      left: '3%',
      right: '3%',
      containLabel: true,
    },
    yAxis: {
      type: 'value',
      minInterval: 1,
    },
    xAxis: {
      type: 'category',
    },
    series: [
      {
        name: t('weekly.regular.label'),
        type: 'bar',
        data,
      },
    ],
  }
})

const meansCountOption = computed<ECOption>(() => {
  const data = buildMeanCountChartData(sourceAttempts.value)
  return {
    title: {
      text: `${localeName(user.value.name, locale.value)} - WCA`,
      subtext: `${t('common.total')}: ${getCountChartTotal(data)}`,
    },
    tooltip: {
      trigger: 'axis',
    },
    toolbox: {
      feature: {
        saveAsImage: {
          name: `${localeName(user.value.name, locale.value)}-WCA.png`,
          title: t('common.saveAsImage'),
        },
      },
    },
    legend: {
      bottom: '0%',
    },
    grid: {
      left: '3%',
      right: '3%',
      containLabel: true,
    },
    yAxis: {
      type: 'value',
      minInterval: 1,
    },
    xAxis: {
      type: 'category',
      axisLabel: {
        formatter: (value: string | number) => value === 'DNF' ? value : formatResult(Number(value), 2),
      },
    },
    series: [
      {
        name: t('result.mean'),
        type: 'bar',
        data,
      },
    ],
  }
})

const mixedChartDarkColors = [
  '#60a5fa',
  '#34d399',
  '#fbbf24',
  '#fb7185',
  '#a78bfa',
  '#2dd4bf',
  '#f97316',
  '#f472b6',
]

const mixedChartOption = computed<ECOption>(() => {
  const sourceValues = sourceAttempts.value.map(attempt => attempt.moves)
  const averageSeriesConfig = getMixedAverageSeriesConfig(chartSettings.value.trimPercent)
  const sourceAttemptMap = new Map(sourceAttempts.value.map((attempt, index) => [index + 1, attempt]))
  const isDark = colorMode.value === 'dark'

  function getMixedTooltipStatus(seriesName: string, dataIndex: number) {
    if (seriesName === t('result.single'))
      return sourceAttempts.value[dataIndex]?.moves === WCA_DNF ? 'DNF' : null

    const config = averageSeriesConfig[seriesName as keyof typeof averageSeriesConfig]
    if (!config)
      return null

    return getTooltipAverageStatus(
      sourceValues.slice(dataIndex - config.n + 1, dataIndex + 1),
      config.n,
      config.trimCount,
    )
  }

  return {
    ...(isDark ? { color: mixedChartDarkColors } : {}),
    title: {
      text: `${localeName(user.value.name, locale.value)} - WCA - mixed`,
    },
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        const items = Array.isArray(params) ? params : [params]
        const axisValue = Number(items[0]?.axisValue ?? items[0]?.name)
        const attempt = sourceAttemptMap.get(axisValue)
        const title = [
          items[0]?.axisValueLabel || items[0]?.name || '',
          attempt?.competitionName,
          getCompetitionDateLabel(attempt?.competitionId),
          attempt?.roundTypeId ? `${t(`result.roundType.${attempt.roundTypeId}`)} A${attempt.attemptIndex}` : '',
        ].filter(Boolean).join('<br>')
        const lines = items.map((item: any) => {
          const value = Array.isArray(item.value) ? item.value[1] : item.value
          const status = getMixedTooltipStatus(item.seriesName, item.dataIndex)
          return `${item.marker}${item.seriesName}: ${status ?? formatMixedSeriesTooltipValue(item.seriesName, value)}`
        })
        return [title, ...lines].join('<br>')
      },
    },
    toolbox: {
      feature: {
        saveAsImage: {
          name: `${localeName(user.value.name, locale.value)}-WCA-mixed.png`,
          title: t('common.saveAsImage'),
        },
      },
    },
    dataZoom: [
      {
        type: 'inside',
        xAxisIndex: [0],
      },
      {
        type: 'slider',
        xAxisIndex: [0],
        bottom: '7%',
      },
    ],
    xAxis: {
      type: 'category',
      data: sourceAttempts.value.map((_, index) => index + 1),
    },
    yAxis: {
      type: 'value',
      min: derived.value.minSingle - 1,
      max: derived.value.maxSingle + 1,
      interval: 1,
    },
    legend: {
      bottom: '0%',
    },
    grid: {
      left: '20px',
      right: '40px',
      containLabel: true,
    },
    series: [
      {
        name: t('result.single'),
        zlevel: 10,
        showSymbol: false,
        type: 'line',
        data: buildSingleSeries(sourceAttempts.value),
      },
      {
        name: 'Mo3',
        zlevel: 10,
        showSymbol: false,
        type: 'line',
        data: buildAverageSeries(sourceAttempts.value, 3, 0),
      },
      {
        name: 'Mo6',
        zlevel: 10,
        showSymbol: false,
        type: 'line',
        data: buildAverageSeries(sourceAttempts.value, 6, 0),
      },
      {
        name: 'Ao5',
        zlevel: 10,
        showSymbol: false,
        type: 'line',
        data: buildAverageSeries(sourceAttempts.value, 5, getAverageTrimCount(5, chartSettings.value.trimPercent)),
      },
      {
        name: 'Ao12',
        zlevel: 10,
        showSymbol: false,
        type: 'line',
        data: buildAverageSeries(sourceAttempts.value, 12, getAverageTrimCount(12, chartSettings.value.trimPercent)),
      },
      {
        name: 'Ao50',
        zlevel: 10,
        showSymbol: false,
        type: 'line',
        data: buildAverageSeries(sourceAttempts.value, 50, getAverageTrimCount(50, chartSettings.value.trimPercent)),
      },
      {
        name: 'Ao100',
        zlevel: 10,
        showSymbol: false,
        type: 'line',
        data: buildAverageSeries(sourceAttempts.value, 100, getAverageTrimCount(100, chartSettings.value.trimPercent)),
      },
      {
        name: t('result.mean'),
        zlevel: 10,
        showSymbol: false,
        type: 'line',
        data: buildCumulativeAverageSeries(sourceAttempts.value, chartSettings.value.trimPercent),
      },
    ],
  }
})
</script>

<template>
  <div class="mt-4">
    <div class="mb-4">
      <button
        class="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 shadow-md hover:shadow-lg transition-all duration-200 text-xs"
        @click="chartSettings.expanded = !chartSettings.expanded"
      >
        {{ chartSettings.expanded ? 'Hide chart options' : 'Show chart options' }}
      </button>
    </div>
    <div v-if="chartSettings.expanded" class="mb-4 flex flex-wrap items-center gap-3 text-sm">
      <label class="flex items-center gap-2 text-gray-600">
        <span>{{ t('result.chartOptions.includeDNF') }}</span>
        <input
          v-model="chartSettings.includeDNF"
          type="checkbox"
          class="border-gray-300 text-indigo-500 focus:ring-2 focus:ring-indigo-200/50"
        >
      </label>
      <label class="flex items-center gap-2 text-gray-600">
        <span>{{ t('result.chartOptions.fillCounts') }}</span>
        <input
          v-model="chartSettings.fillCounts"
          type="checkbox"
          class="border-gray-300 text-indigo-500 focus:ring-2 focus:ring-indigo-200/50"
        >
      </label>
      <label class="flex items-center gap-2 text-gray-600">
        <span>{{ t('result.chartOptions.trim') }}</span>
        <div class="relative w-20">
          <input
            v-model.number="chartSettings.trimPercent"
            type="number"
            min="0"
            max="49"
            class="block w-full pr-7 shadow-sm border-gray-300 focus:ring-2 focus:border-indigo-300 focus:ring-indigo-200/50"
          >
          <span class="absolute inset-y-0 right-2 flex items-center text-sm text-gray-500 pointer-events-none">%</span>
        </div>
      </label>
    </div>
    <div v-if="chartSettings.expanded && maxMs > minMs" class="mb-4 flex flex-col gap-2 text-sm">
      <div class="flex flex-wrap items-center gap-2">
        <button
          class="px-3 py-1 shadow-md hover:shadow-lg transition-all duration-200 text-xs"
          :class="chartSettings.rangeMode === 'time' ? 'bg-indigo-500 hover:bg-indigo-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'"
          @click="setRangeMode('time')"
        >
          {{ t('result.chartOptions.timeRange') }}
        </button>
        <button
          class="px-3 py-1 shadow-md hover:shadow-lg transition-all duration-200 text-xs"
          :class="chartSettings.rangeMode === 'attempt' ? 'bg-indigo-500 hover:bg-indigo-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'"
          @click="setRangeMode('attempt')"
        >
          {{ t('result.chartOptions.attemptRange') }}
        </button>
      </div>
      <div v-if="chartSettings.rangeMode === 'time'" class="flex flex-wrap items-center gap-2">
        <button
          class="bg-indigo-500 hover:bg-indigo-600 text-white px-3 py-1 shadow-md hover:shadow-lg transition-all duration-200 text-xs"
          @click="setRangeMonths(3)"
        >
          {{ t('result.chartOptions.last3Months') }}
        </button>
        <button
          class="bg-indigo-500 hover:bg-indigo-600 text-white px-3 py-1 shadow-md hover:shadow-lg transition-all duration-200 text-xs"
          @click="setRangeMonths(12)"
        >
          {{ t('result.chartOptions.lastYear') }}
        </button>
        <button
          class="bg-indigo-500 hover:bg-indigo-600 text-white px-3 py-1 shadow-md hover:shadow-lg transition-all duration-200 text-xs"
          @click="setRangeMonths(null)"
        >
          {{ t('result.chartOptions.allRange') }}
        </button>
        <span class="font-mono text-gray-600">
          {{ toDateStr(rangeStartMs) }} ~ {{ toDateStr(rangeEndMs) }}
        </span>
      </div>
      <div v-if="chartSettings.rangeMode === 'time'" class="range-slider relative h-6 w-full max-w-xl">
        <div class="absolute top-1/2 left-0 right-0 h-1 -translate-y-1/2 bg-gray-200" />
        <div
          class="absolute top-1/2 h-1 -translate-y-1/2 bg-indigo-500"
          :style="{ left: rangeTrack.left, right: rangeTrack.right }"
        />
        <input
          v-model.number="rangeStartMs"
          type="range"
          class="thumb"
          :min="minMs"
          :max="maxMs"
          :step="DAY_MS"
        >
        <input
          v-model.number="rangeEndMs"
          type="range"
          class="thumb"
          :min="minMs"
          :max="maxMs"
          :step="DAY_MS"
        >
      </div>
      <div v-if="chartSettings.rangeMode === 'attempt'" class="flex flex-wrap items-center gap-2">
        <button
          class="bg-indigo-500 hover:bg-indigo-600 text-white px-3 py-1 shadow-md hover:shadow-lg transition-all duration-200 text-xs"
          @click="setRecentAttemptCount(100)"
        >
          {{ t('result.chartOptions.recentAttempts', { count: 100 }) }}
        </button>
        <button
          class="bg-indigo-500 hover:bg-indigo-600 text-white px-3 py-1 shadow-md hover:shadow-lg transition-all duration-200 text-xs"
          @click="setRecentAttemptCount(50)"
        >
          {{ t('result.chartOptions.recentAttempts', { count: 50 }) }}
        </button>
        <button
          class="bg-indigo-500 hover:bg-indigo-600 text-white px-3 py-1 shadow-md hover:shadow-lg transition-all duration-200 text-xs"
          @click="setAllAttemptsRange"
        >
          {{ t('result.chartOptions.allRange') }}
        </button>
        <span class="font-mono text-gray-600">
          {{ t('result.chartOptions.attemptRangeLabel', { selected: attemptRangeCount, start: attemptRangeStart, end: attemptRangeEnd, total: availableAttempts.length }) }}
        </span>
      </div>
      <div v-if="chartSettings.rangeMode === 'attempt'" class="range-slider relative h-6 w-full max-w-xl">
        <div class="absolute top-1/2 left-0 right-0 h-1 -translate-y-1/2 bg-gray-200" />
        <div
          class="absolute top-1/2 h-1 -translate-y-1/2 bg-indigo-500"
          :style="{ left: attemptRangeTrack.left, right: attemptRangeTrack.right }"
        />
        <input
          v-model.number="attemptRangeStart"
          type="range"
          class="thumb"
          min="1"
          :max="Math.max(availableAttempts.length, 1)"
          step="1"
        >
        <input
          v-model.number="attemptRangeEnd"
          type="range"
          class="thumb"
          min="1"
          :max="Math.max(availableAttempts.length, 1)"
          step="1"
        >
      </div>
    </div>
    <div class="h-[480px]">
      <VChart :option="mixedChartOption" autoresize />
    </div>
    <div class="mb-4 flex flex-wrap gap-x-4 gap-y-2 text-sm">
      <div class="font-semibold text-gray-700">
        {{ t('result.bestAverages') }}
      </div>
      <div
        v-for="item in mixedBestAverages"
        :key="item.label"
        class="font-mono text-gray-600"
      >
        {{ item.label }}: {{ item.value == null ? '-' : formatWCAResult(item.value, 2, 1) }}
      </div>
    </div>
    <div class="h-[350px]">
      <VChart :option="movesCountOption" autoresize />
    </div>
    <div class="h-[350px]">
      <VChart :option="meansCountOption" autoresize />
    </div>
    <div class="h-[480px]">
      <VChart :option="meanChartOption" autoresize />
    </div>
    <div class="overflow-x-auto">
      <WcaResults :results="fmResultsByCompetitionDateDesc" :competition-meta="competitionMeta" />
    </div>
  </div>
</template>

<style scoped>
.range-slider .thumb {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  margin: 0;
  background: transparent;
  pointer-events: none;
  appearance: none;
  -webkit-appearance: none;
}

.range-slider .thumb:focus {
  outline: none;
}

.range-slider .thumb::-webkit-slider-thumb {
  pointer-events: auto;
  appearance: none;
  -webkit-appearance: none;
  height: 16px;
  width: 16px;
  border-radius: 9999px;
  background: #6366f1;
  border: 2px solid #fff;
  box-shadow: 0 1px 3px rgb(0 0 0 / 30%);
  cursor: pointer;
}

.range-slider .thumb::-moz-range-thumb {
  pointer-events: auto;
  height: 16px;
  width: 16px;
  border-radius: 9999px;
  background: #6366f1;
  border: 2px solid #fff;
  box-shadow: 0 1px 3px rgb(0 0 0 / 30%);
  cursor: pointer;
}

.range-slider .thumb::-webkit-slider-runnable-track {
  background: transparent;
}

.range-slider .thumb::-moz-range-track {
  background: transparent;
}
</style>
