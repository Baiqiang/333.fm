<script setup lang="ts">
const { t, locale } = useI18n()
const user = inject(SYMBOL_USER)!
const { data } = await useApi<Result[]>(`/profile/${user.value.id}/league`)
const results = ref<Result[]>(data.value || [])
const nonDNFMeanResults = results.value.filter(result => result.average !== DNF)
const regularResults = nonDNFMeanResults.filter(result => result.mode === CompetitionMode.REGULAR).reverse()
const unlimitedMap: Record<number, Result> = {}
for (const result of nonDNFMeanResults) {
  unlimitedMap[result.competition.id] = result
}
const unlimitedResults = Object.values(unlimitedMap).sort((a, b) => a.competition.id - b.competition.id)
const meanChartOption: ECOption = {
  title: {
    text: `${localeName(user.value.name, locale.value)} - ${t('league.title')} - ${t('result.mean')}`,
  },
  tooltip: {
    trigger: 'axis',
    valueFormatter: (value: any) => formatResult(value * 100, 2),
  },
  toolbox: {
    feature: {
      saveAsImage: {
        name: `${localeName(user.value.name, locale.value)}-${t('league.title')}-${t('result.mean')}.png`,
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
    data: nonDNFMeanResults.map(r => leagueWeekName(r.competition)).sort(),
    boundaryGap: true,
  },
  yAxis: {
    type: 'value',
    min: Math.min(...unlimitedResults.map(r => r.average / 100)) - 2 / 3,
    max: Math.max(...regularResults.map(r => r.average / 100)) + 2 / 3,
    interval: 1 / 3,
    axisLabel: {
      formatter: (value: number) => formatResult(Math.floor(value * 300) / 3, 2),
    },
  },
  legend: {
    bottom: '0%',
    selected: {
      [t('league.mode.participants')]: true,
      [t('league.mode.others')]: false,
    },
  },
  grid: {
    left: '20px',
    right: '40px',
    containLabel: true,
  },
  series: [
    {
      name: t('league.mode.participants'),
      showSymbol: false,
      type: 'line',
      data: regularResults.map(r => [leagueWeekName(r.competition), formatResult(r.average, 2)]),
      zlevel: 10,
      color: '#6366f1',
      markPoint: {
        data: [
          {
            name: 'Worst',
            type: 'max',
            itemStyle: {
              color: 'red',
            },
            label: {
              formatter: (params: any) => formatResult(params.value * 100, 2),
            },
          },
          {
            name: 'Best',
            type: 'min',
            itemStyle: {
              color: 'green',
            },
            label: {
              formatter: (params: any) => formatResult(params.value * 100, 2),
            },
          },
        ],
      },
    },
    {
      name: t('league.mode.others'),
      showSymbol: false,
      type: 'line',
      data: unlimitedResults.map(r => [leagueWeekName(r.competition), formatResult(r.average, 2)]),
      color: '#f97316',
      markPoint: {
        data: [
          {
            name: 'Worst',
            type: 'max',
            label: {
              formatter: (params: any) => formatResult(params.value * 100, 2),
            },
          },
          {
            name: 'Best',
            type: 'min',
            label: {
              formatter: (params: any) => formatResult(params.value * 100, 2),
            },
          },
        ],
      },
    },
  ],
}
const attemptsTimeMap: Record<string, Date> = {}
const regularSinglesMap: Record<string, Submission> = {}
const unlimitedSinglesMap: Record<string, Submission> = {}
const regularMovesCountMap: Record<number, number> = {}
const unlimitedMovesCountMap: Record<number, number> = {}
for (const result of results.value) {
  const weekName = leagueWeekName(result.competition)
  if (result.mode === CompetitionMode.REGULAR) {
    for (const submission of result.submissions) {
      submission.competition = result.competition
      const { moves, scramble } = submission
      const attempt = `${weekName} A${scramble.number}`
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
      const attempt = `${weekName} A${scramble.number}`
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
    text: `${localeName(user.value.name, locale.value)} - ${t('league.title')} - ${t('result.single')}`,
  },
  tooltip: {
    trigger: 'axis',
  },
  toolbox: {
    feature: {
      saveAsImage: {
        name: `${localeName(user.value.name, locale.value)}-${t('league.title')}-${t('result.single')}.png`,
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
      name: t('league.mode.participants'),
      zlevel: 10,
      showSymbol: false,
      color: '#6366f1',
      type: 'line',
      data: regularSingles.map((s, i) => ({
        name: `${leagueWeekName(s.competition)} A${s.scramble.number}`,
        value: [`${leagueWeekName(s.competition)} A${s.scramble.number}`, s.moves / 100],
      })),
    },
    {
      name: t('league.mode.others'),
      zlevel: 10,
      color: '#f97316',
      type: 'scatter',
      data: Object.values(unlimitedSinglesMap).map(s => ({
        name: `${leagueWeekName(s.competition)} A${s.scramble.number}`,
        value: [
          `${leagueWeekName(s.competition)} A${s.scramble.number}`,
          s.moves / 100,
        ],
      })),
    },
  ],
}
const movesCountOption: ECOption = {
  title: {
    text: `${localeName(user.value.name, locale.value)} - ${t('league.title')}`,
  },
  tooltip: {
    trigger: 'axis',
  },
  toolbox: {
    feature: {
      saveAsImage: {
        name: `${localeName(user.value.name, locale.value)}-${t('league.title')}.png`,
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
      name: t('league.mode.participants'),
      type: 'bar',
      data: regularMovesCount,
      stack: 'Total',
    },
    {
      name: t('league.mode.others'),
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
      <VChart :option="meanChartOption" autoresize />
    </div>
    <div class="h-[480px]">
      <VChart :option="singleChartOption" autoresize />
    </div>
    <div class="h-[350px]">
      <VChart :option="movesCountOption" autoresize />
    </div>
    <UserResults :results="results" type="league" />
  </div>
</template>
