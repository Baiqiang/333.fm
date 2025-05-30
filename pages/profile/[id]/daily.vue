<script setup lang="ts">
const { t, locale } = useI18n()
const user = inject(SYMBOL_USER)!
const { data } = await useApi<Result[]>(`/profile/${user.value.id}/daily`)
const results = ref<Result[]>(data.value || [])
const nonDNFMeanResults = results.value.filter(result => result.average !== DNF)
const unlimitedMap: Record<number, Result> = {}
for (const result of nonDNFMeanResults) {
  unlimitedMap[result.competition.id] = result
}
const attemptsTimeMap: Record<string, Date> = {}
const regularSinglesMap: Record<string, Submission> = {}
const unlimitedSinglesMap: Record<string, Submission> = {}
const regularMovesCountMap: Record<number, number> = {}
const unlimitedMovesCountMap: Record<number, number> = {}
for (const result of results.value) {
  const { alias } = result.competition
  if (result.mode === CompetitionMode.REGULAR) {
    for (const submission of result.submissions) {
      submission.competition = result.competition
      const { moves, scramble } = submission
      const attempt = `${alias} A${scramble.number}`
      if (!attemptsTimeMap[attempt]) {
        attemptsTimeMap[attempt] = new Date(submission.createdAt)
      }
      if (moves > 0 && moves !== DNF && moves !== DNS) {
        const m = moves / 100
        regularSinglesMap[attempt] = submission
        regularMovesCountMap[m] = (regularMovesCountMap[m] || 0) + 1
      }
    }
  }
  else {
    for (const submission of result.submissions) {
      submission.competition = result.competition
      const { moves, scramble } = submission
      const attempt = `${alias} A${scramble.number}`
      if (!attemptsTimeMap[attempt]) {
        attemptsTimeMap[attempt] = new Date(submission.createdAt)
      }
      if (moves > 0 && moves !== DNF && moves !== DNS) {
        const m = moves / 100
        unlimitedSinglesMap[attempt] = submission
        unlimitedMovesCountMap[m] = (unlimitedMovesCountMap[m] || 0) + 1
      }
    }
  }
}
// sort singles by submission time
const xAxis = Object.keys(attemptsTimeMap)
  .sort((a, b) => attemptsTimeMap[a].getTime() - attemptsTimeMap[b].getTime())
const regularSingles = Object.values(regularSinglesMap).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
const regularMovesCount = Object.entries(regularMovesCountMap).map(([m, count]) => [Number(m), count])
const unlimitedMovesCount = Object.entries(unlimitedMovesCountMap).map(([m, count]) => [Number(m), count])
regularMovesCount.sort((a, b) => a[0] - b[0])
unlimitedMovesCount.sort((a, b) => a[0] - b[0])
const singleChartOption: ECOption = {
  title: {
    text: `${localeName(user.value.name, locale.value)} - ${t('daily.title')} - ${t('result.single')}`,
  },
  tooltip: {
    trigger: 'axis',
  },
  toolbox: {
    feature: {
      saveAsImage: {
        name: `${localeName(user.value.name, locale.value)}-${t('daily.title')}-${t('result.single')}.png`,
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
    data: xAxis,
    // data: results.value.map(r => r.competition.alias).reverse(),
  },
  yAxis: {
    type: 'value',
    min: Math.min(
      ...Object.values(regularSingles).map(s => s.moves / 100),
      Math.min(...Object.values(unlimitedSinglesMap).map(s => s.moves / 100)),
    ) - 1,
    max: Math.max(
      ...Object.values(regularSingles).map(s => s.moves / 100),
      Math.max(...Object.values(unlimitedSinglesMap).map(s => s.moves / 100)),
    ) + 1,
    interval: 1,
  },
  legend: {
    type: 'scroll',
    bottom: '0%',
  },
  grid: {
    left: '20px',
    right: '40px',
    containLabel: true,
  },
  series: [
    {
      name: t('weekly.regular.label'),
      zlevel: 10,
      showSymbol: false,
      color: '#6366f1',
      type: 'line',
      data: regularSingles.map((s, i) => ({
        name: `${s.competition.alias} A${s.scramble.number}`,
        value: [`${s.competition.alias} A${s.scramble.number}`, s.moves / 100],
      })),
    },
    {
      name: t('weekly.unlimited.label'),
      zlevel: 10,
      color: '#f97316',
      type: 'scatter',
      data: Object.values(unlimitedSinglesMap).map(s => ({
        name: `${s.competition.alias} A${s.scramble.number}`,
        value: [
          `${s.competition.alias} A${s.scramble.number}`,
          s.moves / 100,
        ],
      })),
    },
  ],
}
const movesCountOption: ECOption = {
  title: {
    text: `${localeName(user.value.name, locale.value)} - ${t('daily.title')}`,
  },
  tooltip: {
    trigger: 'axis',
  },
  toolbox: {
    feature: {
      saveAsImage: {
        name: `${localeName(user.value.name, locale.value)}-${t('daily.title')}.png`,
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
      data: regularMovesCount,
      stack: 'Total',
    },
    {
      name: t('weekly.unlimited.label'),
      type: 'bar',
      data: unlimitedMovesCount,
      stack: 'Total',
    },
  ],
}
</script>

<template>
  <div class="mt-4">
    <div class="h-[480px]">
      <VChart :option="singleChartOption" autoresize />
    </div>
    <div class="h-[350px]">
      <VChart :option="movesCountOption" autoresize />
    </div>
    <UserResults :results="results" />
  </div>
</template>
