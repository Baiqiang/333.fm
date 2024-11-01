<script setup lang="ts">
const { t, locale } = useI18n()
const user = inject(SYMBOL_USER)!
const { data } = await useApi<Result[]>(`/profile/${user.value.id}/weekly`)
const results = ref<Result[]>(data.value || [])
const nonDNFMeanResults = results.value.filter(result => result.average !== DNF).reverse()
const regularResults = nonDNFMeanResults.filter(result => result.mode === CompetitionMode.REGULAR)
const unlimitedResults = nonDNFMeanResults.filter(result => result.mode === CompetitionMode.UNLIMITED)
const unlimitedMap = Object.fromEntries(unlimitedResults.map(result => [result.competition.id, result]))
const fullUnlimitedResults = regularResults.map(result => unlimitedMap[result.competition.id] || result)
const chartOption: ECOption = {
  title: {
    text: `${localeName(user.value.name, locale.value)} - ${t('weekly.title')}`,
  },
  tooltip: {
    trigger: 'axis',
    valueFormatter: (value: any) => formatResult(value * 100, 2),
  },
  toolbox: {
    feature: {
      saveAsImage: {
        name: `${localeName(user.value.name, locale.value)}-${t('weekly.title')}.png`,
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
    data: regularResults.map(r => r.competition.alias),
    boundaryGap: true,
  },
  yAxis: {
    type: 'value',
    min: Math.min(...fullUnlimitedResults.map(r => r.average / 100)) - 2 / 3,
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
      data: regularResults.map(r => formatResult(r.average, 2)),
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
      data: fullUnlimitedResults.map(r => formatResult(r.average, 2)),
      color: '#f97316',
      markPoint: {
        data: [
          {
            name: 'Worst',
            type: 'max',
            itemStyle: {
              // color: 'red',
            },
            label: {
              formatter: (params: any) => formatResult(params.value * 100, 2),
            },
          },
          {
            name: 'Best',
            type: 'min',
            itemStyle: {
              // color: 'green',
            },
            label: {
              formatter: (params: any) => formatResult(params.value * 100, 2),
            },
          },
        ],
      },
    },
    // {
    //   type: 'line',
    //   data: [],
    //   markLine: {
    //     data: [
    //       {
    //         name: t('endless.stats.moves'),
    //         yAxis: currentMean.value,
    //         lineStyle: {
    //           color: 'rgb(99, 102, 241)',
    //         },
    //       },
    //     ],
    //   },
    // },
  ],
}
</script>

<template>
  <div class="mt-4">
    <div class="h-[480px]">
      <VChart :option="chartOption" autoresize />
    </div>
    <UserResults :results="results" />
  </div>
</template>
