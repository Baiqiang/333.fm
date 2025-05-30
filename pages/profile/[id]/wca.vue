<script setup lang="ts">
const { t, locale } = useI18n()
const user = inject(SYMBOL_USER)!
const { data } = await useFetch<WCAResult[]>(`https://www.worldcubeassociation.org/api/v0/persons/${user.value.wcaId}/results`)
const results = ref<WCAResult[]>(data.value || [])
const fmResults = results.value.filter(r => r.event_id === '333fm')
const nonDNFMeanResults = fmResults.filter(r => r.average > 0)
const singles: Record<number, [string, number][]> = {}
const movesCountMap: Record<number, number> = {}
const meansCountMap: Record<number, number> = {}
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
const mo3s: number[] = []
const ao5s: number[] = []
const ao12s: number[] = []
const ao50s: number[] = []
const ao100s: number[] = []
const means: number[] = []
for (let i = 0; i < allSingles.length; i++) {
  mo3s.push(aoN(allSingles.slice(i - 2, i + 1), 3, true))
  ao5s.push(aoN(allSingles.slice(i - 4, i + 1), 5))
  ao12s.push(aoN(allSingles.slice(i - 11, i + 1), 12))
  ao50s.push(aoN(allSingles.slice(i - 49, i + 1), 50))
  ao100s.push(aoN(allSingles.slice(i - 99, i + 1), 100))
  means.push(aoN(allSingles.slice(0, i + 1), 0, true))
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
const mixedChartOption: ECOption = {
  title: {
    text: `${localeName(user.value.name, locale.value)} - WCA - mixed (DNF excluded)`,
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
    // data: fmResults.map(r => r.competition_id),
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
      data: allSingles,
    },
    {
      name: 'Mo3',
      zlevel: 10,
      showSymbol: false,
      type: 'line',
      data: mo3s,
    },
    {
      name: 'Ao5',
      zlevel: 10,
      showSymbol: false,
      type: 'line',
      data: ao5s,
    },
    {
      name: 'Ao12',
      zlevel: 10,
      showSymbol: false,
      type: 'line',
      data: ao12s,
    },
    {
      name: 'Ao50',
      zlevel: 10,
      showSymbol: false,
      type: 'line',
      data: ao50s,
    },
    {
      name: 'Ao100',
      zlevel: 10,
      showSymbol: false,
      type: 'line',
      data: ao100s,
    },
    {
      name: t('result.mean'),
      zlevel: 10,
      showSymbol: false,
      type: 'line',
      data: means,
    },
  ],
}
</script>

<template>
  <div class="mt-4">
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
    <WcaResults :results="fmResults" />
  </div>
</template>
