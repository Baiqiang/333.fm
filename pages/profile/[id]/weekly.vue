<script setup lang="ts">
const { t, locale } = useI18n()
const user = inject(SYMBOL_USER)!
const { data } = await useApi<Result[]>(`/profile/${user.value.id}/weekly`)
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
    text: `${localeName(user.value.name, locale.value)} - ${t('weekly.title')} - ${t('result.mean')}`,
  },
  tooltip: {
    trigger: 'axis',
    valueFormatter: (value: any) => formatResult(value * 100, 2),
  },
  toolbox: {
    feature: {
      saveAsImage: {
        name: `${localeName(user.value.name, locale.value)}-${t('weekly.title')}-${t('result.mean')}.png`,
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
    data: nonDNFMeanResults.map(r => r.competition.alias).sort(),
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
      [t('weekly.regular.label')]: true,
      [t('weekly.unlimited.label')]: false,
    },
  },
  grid: {
    left: '20px',
    right: '40px',
    containLabel: true,
  },
  series: [
    {
      name: t('weekly.regular.label'),
      showSymbol: false,
      type: 'line',
      data: regularResults.map(r => [r.competition.alias, formatResult(r.average, 2)]),
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
      name: t('weekly.unlimited.label'),
      showSymbol: false,
      type: 'line',
      data: unlimitedResults.map(r => [r.competition.alias, formatResult(r.average, 2)]),
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
const regularSingles: [Date, number][] = []
const unlimitedSingles: [Date, number][] = []
const regularMovesCountMap: Record<number, number> = {}
const unlimitedMovesCountMap: Record<number, number> = {}
for (const result of results.value) {
  if (result.mode === CompetitionMode.REGULAR) {
    for (const { moves, createdAt } of result.submissions) {
      if (moves > 0 && moves !== DNF && moves !== DNS) {
        const m = moves / 100
        regularSingles.push([new Date(createdAt), m])
        regularMovesCountMap[m] = (regularMovesCountMap[m] || 0) + 1
      }
    }
  }
  else {
    for (const { moves, createdAt } of result.submissions) {
      if (moves > 0 && moves !== DNF && moves !== DNS) {
        const m = moves / 100
        unlimitedSingles.push([new Date(createdAt), m])
        unlimitedMovesCountMap[m] = (unlimitedMovesCountMap[m] || 0) + 1
      }
    }
  }
}
regularSingles.sort((a, b) => a[0].getTime() - b[0].getTime())
unlimitedSingles.sort((a, b) => a[0].getTime() - b[0].getTime())
const regularMovesCount = Object.entries(regularMovesCountMap).map(([m, count]) => [Number(m), count])
const unlimitedMovesCount = Object.entries(unlimitedMovesCountMap).map(([m, count]) => [Number(m), count])
regularMovesCount.sort((a, b) => a[0] - b[0])
unlimitedMovesCount.sort((a, b) => a[0] - b[0])
const singleChartOption: ECOption = {
  title: {
    text: `${localeName(user.value.name, locale.value)} - ${t('weekly.title')} - ${t('result.single')}`,
  },
  tooltip: {
    trigger: 'axis',
  },
  toolbox: {
    feature: {
      saveAsImage: {
        name: `${localeName(user.value.name, locale.value)}-${t('weekly.title')}-${t('result.single')}.png`,
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
    type: 'time',
  },
  yAxis: {
    type: 'value',
    min: Math.min(...regularSingles.map(s => s[1]), ...unlimitedSingles.map(s => s[1])) - 1,
    max: Math.max(...regularSingles.map(s => s[1]), ...unlimitedSingles.map(s => s[1])) + 1,
    interval: 1,
  },
  legend: {
    bottom: '0%',
    selected: {
      [t('weekly.regular.label')]: true,
      [t('weekly.unlimited.label')]: false,
    },
  },
  grid: {
    left: '20px',
    right: '40px',
    containLabel: true,
  },
  series: [
    {
      name: t('weekly.regular.label'),
      showSymbol: false,
      type: 'line',
      data: regularSingles,
      color: '#6366f1',
      markPoint: {
        data: [
          {
            name: 'Worst',
            type: 'max',
            itemStyle: {
              color: 'red',
            },
          },
          {
            name: 'Best',
            type: 'min',
            itemStyle: {
              color: 'green',
            },
          },
        ],
      },
    },
    {
      name: t('weekly.unlimited.label'),
      showSymbol: false,
      type: 'line',
      data: unlimitedSingles,
      color: '#f97316',
      markPoint: {
        data: [
          {
            name: 'Worst',
            type: 'max',
          },
          {
            name: 'Best',
            type: 'min',
          },
        ],
      },
    },
  ],
}
const movesCountOption: ECOption = {
  title: {
    text: `${localeName(user.value.name, locale.value)} - ${t('weekly.title')}`,
  },
  tooltip: {
    trigger: 'axis',
  },
  toolbox: {
    feature: {
      saveAsImage: {
        name: `${localeName(user.value.name, locale.value)}-${t('weekly.title')}.png`,
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
      <VChart :option="meanChartOption" autoresize />
    </div>
    <div class="h-[480px]">
      <VChart :option="singleChartOption" autoresize />
    </div>
    <div class="h-[350px]">
      <VChart :option="movesCountOption" autoresize />
    </div>
    <UserResults :results="results" />
  </div>
</template>
