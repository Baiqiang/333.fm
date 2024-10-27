<script setup lang="ts">
import { twMerge } from 'tailwind-merge'

const props = defineProps<{
  endless: Endless
}>()
const { data } = await useApi<{ submissions: Submission[] }>(`/endless/${props.endless.alias}/user-stats`)
const { t, locale } = useI18n()
const user = useUser()

interface PersonalResult {
  level: number
  id: number
  moves: number
  mo3: number
  ao5: number
  ao12: number
  mean: number
  unlimited: boolean
}

const stats = computed<{
  results: PersonalResult[]
  movesCount: {
    moves: number
    count: number
    unlimited: number
  }[]
  best: {
    single: number
    mean: number
    mo3: number
    ao5: number
    ao12: number
  }
  worst: {
    single: number
    mean: number
    mo3: number
    ao5: number
    ao12: number
  }
}>(() => {
  const results: PersonalResult[] = []
  const movesCountMap: Record<number, {
    moves: number
    count: number
    unlimited: number
  }> = {}
  const moves: number[] = []
  const best = {
    single: Number.POSITIVE_INFINITY,
    mean: Number.POSITIVE_INFINITY,
    mo3: Number.POSITIVE_INFINITY,
    ao5: Number.POSITIVE_INFINITY,
    ao12: Number.POSITIVE_INFINITY,
  }
  const worst = {
    single: Number.NEGATIVE_INFINITY,
    mean: Number.NEGATIVE_INFINITY,
    mo3: Number.NEGATIVE_INFINITY,
    ao5: Number.NEGATIVE_INFINITY,
    ao12: Number.NEGATIVE_INFINITY,
  }
  for (const submission of (data.value?.submissions || [])) {
    movesCountMap[submission.moves] = {
      moves: submission.moves,
      count: (movesCountMap[submission.moves]?.count || 0) + 1,
      unlimited: (movesCountMap[submission.moves]?.unlimited || 0) + (submission.mode === CompetitionMode.UNLIMITED ? 1 : 0),
    }
    moves.push(submission.moves)
    const mo3 = aoN(moves, 3, true)
    const ao5 = aoN(moves, 5)
    const ao12 = aoN(moves, 12)
    const mean = aoN(moves, 0, true)
    if (submission.moves < best.single)
      best.single = submission.moves
    if (submission.moves > worst.single)
      worst.single = submission.moves
    if (mo3 < best.mo3)
      best.mo3 = mo3
    if (mo3 > worst.mo3)
      worst.mo3 = mo3
    if (ao5 < best.ao5)
      best.ao5 = ao5
    if (ao5 > worst.ao5)
      worst.ao5 = ao5
    if (ao12 < best.ao12)
      best.ao12 = ao12
    if (ao12 > worst.ao12)
      worst.ao12 = ao12
    if (mean < best.mean)
      best.mean = mean
    if (mean > worst.mean)
      worst.mean = mean

    results.push({
      level: results.length + 1,
      id: submission.id,
      moves: submission.moves,
      mo3,
      ao5,
      ao12,
      mean,
      unlimited: submission.mode === CompetitionMode.UNLIMITED,
    })
  }

  results.reverse()

  return {
    results,
    movesCount: Object.values(movesCountMap).sort((a, b) => a.moves - b.moves),
    best,
    worst,
  }
})
const best = computed(() => stats.value.best)
const worst = computed(() => stats.value.worst)
const movesCount = computed(() => stats.value.movesCount)
const currentCell = reactive({
  type: 0,
  index: -1,
})
const lineOptions = computed(() => {
  return {
    chart: {
      height: 350,
      type: 'line',
      events: {
        beforeZoom(ctx: any) {
          ctx.w.config.xaxis.range = undefined
        },
      },
    },
    stroke: {
      width: 2,
    },
    title: {
      text: `${localeName(user.name, locale.value)} - ${props.endless.name}`,
    },
    tooltip: {
      followCursor: true,
    },
    grid: {
      row: {
        colors: ['#f3f3f3', 'transparent'],
        opacity: 0.5,
      },
    },
    xaxis: {
      categories: stats.value.results.map(r => r.level).reverse(),
      range: Math.min(30, stats.value.results.length - 1),
    },
    yaxis: {
      labels: {
        formatter(value: number, { seriesIndex }: { seriesIndex: number }) {
          if (seriesIndex === 0 || seriesIndex === undefined)
            return value
          return value?.toFixed(2)
        },
      },
      min: Math.min(...stats.value.results.map(r => r.moves / 100)) - 1,
      max: Math.max(...stats.value.results.map(r => r.moves / 100)) + 1,
      stepSize: 1,
    },
  }
})
const lineSeries = computed(() => {
  return [
    {
      name: t('endless.stats.moves'),
      data: stats.value.results.map(r => formatResult(r.moves)).reverse(),
    },
    {
      name: 'Mo3',
      data: stats.value.results.map(r => Number.isNaN(r.mo3) ? null : formatResult(r.mo3, 2)).reverse(),
    },
    {
      name: 'Ao5',
      data: stats.value.results.map(r => Number.isNaN(r.ao5) ? null : formatResult(r.ao5, 2)).reverse(),
    },
    {
      name: 'Ao12',
      data: stats.value.results.map(r => Number.isNaN(r.ao12) ? null : formatResult(r.ao12, 2)).reverse(),
    },
    {
      name: t('result.mean'),
      data: stats.value.results.map(r => formatResult(r.mean, 2)).reverse(),
    },
  ]
})

const barOptions = computed(() => {
  return {
    chart: {
      height: 350,
      type: 'bar',
      stacked: true,
      zoom: {
        enabled: false,
      },
    },
    plotOptions: {
      bar: {
        dataLabels: {
          total: {
            enabled: true,
            style: {
              // fontSize: '16px',
              // fontWeight: 600,
            },
            formatter(value: number) {
              return `${t('endless.stats.count')}: ${value}`
            },
          },
        },
      },
    },
    tooltip: {
      shared: true,
      intersect: false,
      followCursor: true,
    },
    title: {
      text: `${localeName(user.name, locale.value)} - ${props.endless.name}`,
    },
    xaxis: {
      categories: stats.value.movesCount.map(m => formatResult(m.moves)),
    },
    yaxis: {
      labels: {
        formatter(value: number) {
          return value.toFixed(0)
        },
      },
    },
  }
})
const barSeries = computed(() => {
  return [
    {
      name: t('weekly.regular.label'),
      data: stats.value.movesCount.map(m => m.count - m.unlimited),
    },
    {
      name: t('weekly.unlimited.label'),
      data: stats.value.movesCount.map(m => m.unlimited),
    },
  ]
})

function enterCell(type: number, index: number) {
  currentCell.type = type
  currentCell.index = index
}

function leaveCell() {
  currentCell.type = 0
  currentCell.index = -1
}

function getResultClass(index: number) {
  const startIndex = currentCell.index
  const endIndex = currentCell.index + currentCell.type - 1
  if (index > endIndex || index < startIndex)
    return ''
  const results = stats.value.results.slice(startIndex, endIndex + 1)
  const first = results[0]
  const key = {
    3: 'mo3',
    5: 'ao5',
    12: 'ao12',
  }[currentCell.type]
  if (Number.isNaN(first[key as keyof PersonalResult]))
    return ''
  const cls = ['transition-all']
  if (currentCell.type === 3) {
    cls.push('bg-indigo-500')
  }
  else {
    const best = results.reduce((a, b) => a.moves < b.moves ? a : b)
    const worst = results.reduce((a, b) => a.moves > b.moves ? a : b)
    const bestIndex = stats.value.results.findIndex(r => r === best)
    const worstIndex = stats.value.results.findIndex(r => r === worst)

    if (index === bestIndex)
      cls.push('bg-green-500')
    else if (index === worstIndex)
      cls.push('bg-red-500')
    else
      cls.push('bg-indigo-500')
  }

  cls.push('transform scale-125')
  return cls.join(' ')
}

function getClass(value: number, best: number, worst: number, unlimited = false) {
  const cls = []
  if (value === best)
    cls.push('bg-green-500 text-white')
  if (value === worst)
    cls.push('bg-red-500 text-white')
  if (cls.length > 0)
    cls.push('py-1')
  if (unlimited) {
    if (cls.length === 0) {
      cls.push('bg-orange-500')
    }
    else {
      cls.push('bg-gradient-to-r from-orange-500 from-50% to-50%')
      if (value === best)
        cls.push('to-green-500')
      if (value === worst)
        cls.push('to-red-500')
    }
  }
  if (!Number.isNaN(value))
    cls.push('hover:bg-indigo-500')
  return cls.join(' ')
}
</script>

<template>
  <div class="mt-4">
    <h4 class="font-bold mb-2">
      {{ $t('endless.stats.personal') }}
    </h4>
    <div class="grid auto-cols-max gap-x-2 gap-y-0 text-center">
      <div class="grid grid-cols-subgrid col-span-6 font-bold bg-gray-200 py-1">
        <div class="px-2">
          Level
        </div>
        <div class="px-2">
          {{ $t('weekly.results') }}
        </div>
        <div class="px-2">
          Mo3
        </div>
        <div class="px-2">
          Ao5
        </div>
        <div class="px-2">
          Ao12
        </div>
        <div class="px-2">
          {{ $t('result.mean') }}
        </div>
      </div>
      <div v-for="r, i in stats.results" :key="r.level" class="grid grid-cols-subgrid col-span-6 font-mono odd:bg-gray-200 items-center">
        <NuxtLink :to="competitionPath(endless, { number: r.level })" class="text-blue-500 hover:text-white hover:bg-blue-500 py-1">
          {{ r.level }}
        </NuxtLink>
        <NuxtLink :to="`${competitionPath(endless, { number: r.level })}#submission-${r.id}`" class="font-bold py-1" :class="twMerge(getClass(r.moves, best.single, worst.single, r.unlimited), getResultClass(i))">
          {{ formatResult(r.moves) }}
        </NuxtLink>
        <div class="py-1" :class="getClass(r.mo3, best.mo3, worst.mo3)" @mouseenter="enterCell(3, i)" @mouseleave="leaveCell">
          {{ formatResult(r.mo3, 2) }}
        </div>
        <div class="py-1" :class="getClass(r.ao5, best.ao5, worst.ao5)" @mouseenter="enterCell(5, i)" @mouseleave="leaveCell">
          {{ formatResult(r.ao5, 2) }}
        </div>
        <div class="py-1" :class="getClass(r.ao12, best.ao12, worst.ao12)" @mouseenter="enterCell(12, i)" @mouseleave="leaveCell">
          {{ formatResult(r.ao12, 2) }}
        </div>
        <div :class="getClass(r.mean, best.mean, worst.mean)">
          {{ formatResult(r.mean, 2) }}
        </div>
      </div>
    </div>
    <div>
      <Chart :options="lineOptions" :series="lineSeries" />
    </div>
    <div class="grid auto-cols-max gap-x-2 gap-y-0 text-center mt-4">
      <div class="grid grid-cols-subgrid col-span-3 font-bold bg-gray-200 py-1">
        <div class="px-2">
          {{ $t('endless.stats.moves') }}
        </div>
        <div class="px-2">
          {{ $t('endless.stats.count') }}
        </div>
        <div class="px-2">
          {{ $t('weekly.unlimited.label') }}
        </div>
      </div>
      <div v-for="m in movesCount" :key="m.moves" class="grid grid-cols-subgrid col-span-3 font-mono odd:bg-gray-200 items-center">
        <div class="py-1">
          {{ formatResult(m.moves) }}
        </div>
        <div>
          {{ m.count }}
        </div>
        <div>
          {{ m.unlimited }}
        </div>
      </div>
    </div>
    <div>
      <Chart :options="barOptions" :series="barSeries" />
    </div>
  </div>
</template>

<style scoped>
.unlimited-best {
  background-image: linear-gradient(to right, theme('colors.orange.500') 50%, theme('colors.green.500') 50%);
}
</style>
