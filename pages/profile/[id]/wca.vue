<script setup lang="ts">
const { t, locale } = useI18n()
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
const fmResultsByCompetitionDateDesc = fmResults.slice().sort((a, b) => {
  const dateA = competitionDateMap.get(a.competition_id)
  const dateB = competitionDateMap.get(b.competition_id)
  const endDiff = (dateB?.end ?? 0) - (dateA?.end ?? 0)
  if (endDiff !== 0)
    return endDiff
  const startDiff = (dateB?.start ?? 0) - (dateA?.start ?? 0)
  if (startDiff !== 0)
    return startDiff
  return 0
})
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
const chartSettings = useLocalStorage('profile.wca.chartSettings', {
  expanded: false,
  includeDNF: true,
  trimPercent: 5,
}, {
  initOnMounted: true,
})
const nonDNFMeanResults = fmResults.filter(r => r.average > 0)
const singles: Record<number, [string, number][]> = {}
const movesCountMap: Record<number, number> = {}
const meansCountMap: Record<number, number> = {}
const allAttempts = fmResults.flatMap(result =>
  result.attempts
    .filter(moves => moves > 0 || moves === WCA_DNF)
    .map(moves => ({ moves })),
).map((attempt, index) => ({ index: index + 1, moves: attempt.moves }))
const nonDNFAttempts = allAttempts.filter(attempt => attempt.moves > 0)
const allSingles: number[] = []
for (const result of fmResults) {
  const mean = result.average
  if (mean > 0) {
    meansCountMap[mean] = (meansCountMap[mean] || 0) + 1
  }
  for (const [index, moves] of result.attempts.entries()) {
    if (moves > 0) {
      const scrambleNumer = index + 1
      singles[scrambleNumer] = singles[scrambleNumer] || []
      singles[scrambleNumer].push([result.competition_id, moves])
      movesCountMap[moves] = (movesCountMap[moves] || 0) + 1
      allSingles.push(moves)
    }
  }
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

const sourceAttempts = computed(() => chartSettings.value.includeDNF ? allAttempts : nonDNFAttempts)

function buildSingleSeries(sourceAttempts: { index: number, moves: number }[]) {
  return sourceAttempts.map(attempt => [attempt.index, attempt.moves === WCA_DNF ? null : attempt.moves])
}

function buildAverageSeries(sourceAttempts: { index: number, moves: number }[], n: number, trimCount: number) {
  const sourceValues = sourceAttempts.map(attempt => attempt.moves)
  return sourceAttempts.map((attempt, index) => [
    attempt.index,
    toChartValue(trimmedAverage(sourceValues.slice(index - n + 1, index + 1), n, trimCount)),
  ])
}

function buildCumulativeAverageSeries(sourceAttempts: { index: number, moves: number }[], trimPercent: number) {
  const normalizedPercent = Math.max(0, Math.min(49, Number(trimPercent) || 0))
  const sourceValues = sourceAttempts.map(attempt => attempt.moves)
  return sourceAttempts.map((attempt, index) => {
    const currentValues = sourceValues.slice(0, index + 1)
    const trimCount = Math.ceil(currentValues.length * normalizedPercent / 100)
    return [
      attempt.index,
      toChartValue(trimmedAverage(currentValues, 1, trimCount)),
    ]
  })
}

function getAverageTrimCount(n: number, trimPercent: number) {
  const normalizedPercent = Math.max(0, Math.min(49, Number(trimPercent) || 0))
  return Math.ceil(n * normalizedPercent / 100)
}
const movesCount = Object.entries(movesCountMap).map(([m, count]) => [Number(m), count])
movesCount.sort((a, b) => a[0] - b[0])
const meansCount = Object.entries(meansCountMap).map(([m, count]) => [Number(m), count])
meansCount.sort((a, b) => a[0] - b[0])

const meanChartOption: ECOption = {
  title: {
    text: `${localeName(user.value.name, locale.value)} - WCA`,
  },
  tooltip: {
    trigger: 'axis',
    valueFormatter: (value: any) => formatResult(value * 100, 2),
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
    data: fmResults.map(r => r.competition_id),
    boundaryGap: true,
  },
  yAxis: {
    type: 'value',
    min: Math.min(...allSingles) - 2 / 3,
    max: Math.max(...allSingles) + 2 / 3,
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
      data: nonDNFMeanResults.map(r => [r.competition_id, formatResult(r.average, 2)]),
      zlevel: 10,
    },
    {
      name: 'A1',
      showSymbol: false,
      type: 'line',
      data: singles[1],
    },
    {
      name: 'A2',
      showSymbol: false,
      type: 'line',
      data: singles[2],
    },
    {
      name: 'A3',
      showSymbol: false,
      type: 'line',
      data: singles[3],
    },
  ],
}
const movesCountOption: ECOption = {
  title: {
    text: `${localeName(user.value.name, locale.value)} - WCA`,
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
      data: movesCount,
    },
  ],
}

const meansCountOption: ECOption = {
  title: {
    text: `${localeName(user.value.name, locale.value)} - WCA`,
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
      name: t('result.mean'),
      type: 'bar',
      data: meansCount,
    },
  ],
}
const mixedChartOption = computed<ECOption>(() => ({
  title: {
    text: `${localeName(user.value.name, locale.value)} - WCA - mixed`,
  },
  tooltip: {
    trigger: 'axis',
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
    data: sourceAttempts.value.map(attempt => attempt.index),
  },
  yAxis: {
    type: 'value',
    min: Math.min(...allSingles) - 1,
    max: Math.max(...allSingles) + 1,
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
}))
</script>

<template>
  <div class="mt-4">
    <div class="mb-4">
      <button
        class="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 shadow-md hover:shadow-lg transition-all duration-200"
        @click="chartSettings.expanded = !chartSettings.expanded"
      >
        {{ chartSettings.expanded ? 'Hide chart options' : 'Show chart options' }}
      </button>
    </div>
    <div v-if="chartSettings.expanded" class="mb-4 flex flex-wrap items-center gap-3 text-sm">
      <label class="flex items-center gap-2 text-gray-600">
        <span>Include DNF</span>
        <input
          v-model="chartSettings.includeDNF"
          type="checkbox"
          class="border-gray-300 text-indigo-500 focus:ring-2 focus:ring-indigo-200/50"
        >
      </label>
      <label class="flex items-center gap-2 text-gray-600">
        <span>Trim</span>
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
    <div class="h-[480px]">
      <VChart :option="mixedChartOption" autoresize />
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
