<script setup lang="ts">
const { t, locale } = useI18n()
const user = inject(SYMBOL_USER)!
const { data } = await useApi<Result[]>(`/profile/${user.value.id}/league`)
const results = ref<Result[]>(data.value || [])

interface LeagueStats {
  duels: LeagueDuel[]
  standings: (LeagueStanding & { season: LeagueSeason, tier: LeagueTier })[]
  eloHistories: (LeagueEloHistory & { season: LeagueSeason })[]
  currentElo: number
  leagueResults: LeagueResult[]
}
const { data: statsData } = await useApi<LeagueStats>(`/profile/${user.value.id}/league-stats`)
const stats = ref<LeagueStats>(statsData.value || { duels: [], standings: [], eloHistories: [], currentElo: 0, leagueResults: [] })

const nonDNFMeanResults = results.value.filter(result => result.average !== DNF)
const regularResults = nonDNFMeanResults.filter(result => result.mode === CompetitionMode.REGULAR).reverse()
const unlimitedMap: Record<number, Result> = {}
for (const result of nonDNFMeanResults) {
  unlimitedMap[result.competition.id] = result
}
const unlimitedResults = Object.values(unlimitedMap).sort((a, b) => a.competition.id - b.competition.id)

// --- Stats computation ---
const endedDuels = computed(() => stats.value.duels.filter(d => d.ended))

function getDuelResult(duel: LeagueDuel, userId: number): 'win' | 'draw' | 'loss' | null {
  if (!duel.ended) return null
  const userPoints = duel.user1Id === userId ? duel.user1Points : duel.user2Points
  const opponentPoints = duel.user1Id === userId ? duel.user2Points : duel.user1Points
  const wp = leagueWeekPoints(userPoints, opponentPoints)
  if (wp === 2) return 'win'
  if (wp === 1) return 'draw'
  if (wp === 0) return 'loss'
  return null
}

function getOpponent(duel: LeagueDuel, userId: number) {
  return duel.user1Id === userId ? duel.user2 : duel.user1
}

function getUserSetPoints(duel: LeagueDuel, userId: number) {
  return duel.user1Id === userId ? duel.user1Points : duel.user2Points
}

function getOpponentSetPoints(duel: LeagueDuel, userId: number) {
  return duel.user1Id === userId ? duel.user2Points : duel.user1Points
}

const totalWins = computed(() => endedDuels.value.filter(d => getDuelResult(d, user.value.id) === 'win').length)
const totalDraws = computed(() => endedDuels.value.filter(d => getDuelResult(d, user.value.id) === 'draw').length)
const totalLosses = computed(() => endedDuels.value.filter(d => getDuelResult(d, user.value.id) === 'loss').length)
const winRate = computed(() => {
  const total = totalWins.value + totalDraws.value + totalLosses.value
  if (total === 0) return '0%'
  return `${(totalWins.value / total * 100).toFixed(1)}%`
})

const bestSeason = computed(() => {
  if (stats.value.standings.length === 0) return null
  return stats.value.standings.reduce((best, s) => {
    if (s.points > best.points) return s
    return best
  })
})

// --- ELO chart ---
const eloChartOption = computed<ECOption>(() => {
  const histories = stats.value.eloHistories
  if (histories.length === 0) return {}

  const xData = histories.map(h => `S${h.season.number} W${h.week}`)
  const eloData = histories.map(h => h.points)
  const deltaData = histories.map(h => h.delta)

  return {
    title: {
      text: `${localeName(user.value.name, locale.value)} - ${t('league.profile.eloHistory')}`,
    },
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        const p = params[0]
        const delta = deltaData[p.dataIndex]
        const sign = delta > 0 ? '+' : ''
        return `${p.name}<br/>ELO: <b>${p.value}</b> (${sign}${delta})`
      },
    },
    toolbox: {
      feature: {
        saveAsImage: {
          name: `${localeName(user.value.name, locale.value)}-ELO`,
          title: t('common.saveAsImage'),
        },
      },
    },
    dataZoom: [
      { type: 'inside', xAxisIndex: [0] },
      { type: 'slider', xAxisIndex: [0], bottom: '7%' },
    ],
    xAxis: {
      type: 'category',
      data: xData,
      boundaryGap: true,
    },
    yAxis: {
      type: 'value',
      min: (value: any) => Math.floor(value.min - 10),
      max: (value: any) => Math.ceil(value.max + 10),
    },
    grid: {
      left: '20px',
      right: '40px',
      containLabel: true,
    },
    series: [
      {
        name: 'ELO',
        type: 'line',
        data: eloData,
        showSymbol: true,
        symbolSize: 6,
        color: '#6366f1',
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(99,102,241,0.3)' },
              { offset: 1, color: 'rgba(99,102,241,0.05)' },
            ],
          },
        },
        markPoint: {
          data: [
            { name: 'Max', type: 'max', itemStyle: { color: 'green' } },
            { name: 'Min', type: 'min', itemStyle: { color: 'red' } },
          ],
        },
      },
    ],
  }
})

// --- Points per week (W/D/L timeline) ---
const pointsTimeline = computed(() => {
  const lr = stats.value.leagueResults
  if (lr.length === 0) return []

  const seasonMap: Record<number, { seasonNumber: number, weeks: { week: number, points: number }[] }> = {}
  for (const r of lr) {
    if (!seasonMap[r.seasonId]) {
      const standing = stats.value.standings.find(s => s.seasonId === r.seasonId)
      seasonMap[r.seasonId] = {
        seasonNumber: standing?.season?.number ?? r.seasonId,
        weeks: [],
      }
    }
    seasonMap[r.seasonId].weeks.push({ week: r.week, points: r.points })
  }

  const items: { label: string, points: number }[] = []
  for (const s of Object.values(seasonMap).sort((a, b) => a.seasonNumber - b.seasonNumber)) {
    for (const w of s.weeks.sort((a, b) => a.week - b.week)) {
      items.push({ label: `S${s.seasonNumber} W${w.week}`, points: w.points })
    }
  }
  return items
})

function pointsClass(points: number) {
  switch (points) {
    case 2: return 'bg-green-500 text-white'
    case 1: return 'bg-yellow-500 text-white'
    default: return 'bg-red-500 text-white'
  }
}

function pointsLabel(points: number) {
  switch (points) {
    case 2: return t('league.profile.win')
    case 1: return t('league.profile.draw')
    default: return t('league.profile.loss')
  }
}

// --- Current season detection ---
const onGoingSeasonIds = computed(() => {
  const ids = new Set<number>()
  for (const s of stats.value.standings) {
    if (s.season?.status === LeagueSeasonStatus.ON_GOING) ids.add(s.seasonId)
  }
  for (const d of stats.value.duels) {
    if (d.season?.status === LeagueSeasonStatus.ON_GOING) ids.add(d.seasonId)
  }
  return ids
})

function isOnGoingSeason(seasonId: number) {
  return onGoingSeasonIds.value.has(seasonId)
}

// --- Standings sorted by season desc ---
const standingsDesc = computed(() => {
  return [...stats.value.standings].sort((a, b) => (b.season?.number ?? 0) - (a.season?.number ?? 0))
})

function tierBgClass(tier?: LeagueTier) {
  if (!tier) return ''
  return tierBackgrounds[tier.level] ?? ''
}

// --- Duel history grouped by season ---
const duelsBySeason = computed(() => {
  const map: Record<number, { seasonId: number, seasonNumber: number, duels: LeagueDuel[] }> = {}
  for (const duel of stats.value.duels) {
    const sId = duel.seasonId
    if (!map[sId]) {
      const seasonNumber = duel.season?.number ?? Number(duel.competition?.alias?.match(/league-(\d+)/)?.[1] ?? 0)
      map[sId] = { seasonId: sId, seasonNumber, duels: [] }
    }
    map[sId].duels.push(duel)
  }
  return Object.values(map).sort((a, b) => b.seasonNumber - a.seasonNumber)
})

function resultBadgeClass(result: 'win' | 'draw' | 'loss' | null) {
  switch (result) {
    case 'win': return 'bg-green-500 text-white'
    case 'draw': return 'bg-yellow-500 text-white'
    case 'loss': return 'bg-red-500 text-white'
    default: return 'bg-gray-300 text-gray-600'
  }
}

function resultLabel(result: 'win' | 'draw' | 'loss' | null) {
  switch (result) {
    case 'win': return t('league.profile.win')
    case 'draw': return t('league.profile.draw')
    case 'loss': return t('league.profile.loss')
    default: return '-'
  }
}

// --- Mean chart (existing) ---
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

// --- Single chart (existing) ---
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

// collapsed state for duel history sections
const expandedSeasons = ref<Record<number, boolean>>({})
function toggleSeason(seasonNumber: number) {
  expandedSeasons.value[seasonNumber] = !expandedSeasons.value[seasonNumber]
}
// expand latest season by default
if (duelsBySeason.value.length > 0) {
  expandedSeasons.value[duelsBySeason.value[0].seasonNumber] = true
}
</script>

<template>
  <div class="mt-4">
    <!-- Overview Stats -->
    <div v-if="stats.standings.length > 0" class="mb-6">
      <h3 class="font-bold text-lg mb-3">
        {{ $t('league.profile.overview') }}
      </h3>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div class="bg-indigo-50 p-3">
          <div class="text-xs text-gray-500">
            {{ $t('league.profile.currentElo') }}
          </div>
          <div class="text-2xl font-bold text-indigo-600">
            {{ stats.currentElo }}
          </div>
        </div>
        <div class="bg-indigo-50 p-3">
          <div class="text-xs text-gray-500">
            {{ $t('league.profile.seasons') }}
          </div>
          <div class="text-2xl font-bold text-indigo-600">
            {{ stats.standings.length }}
          </div>
        </div>
        <div class="bg-indigo-50 p-3">
          <div class="text-xs text-gray-500">
            {{ $t('league.profile.totalDuels') }}
          </div>
          <div class="text-2xl font-bold text-indigo-600">
            {{ endedDuels.length }}
          </div>
        </div>
        <div class="bg-indigo-50 p-3">
          <div class="text-xs text-gray-500">
            {{ $t('league.profile.winRate') }}
          </div>
          <div class="text-2xl font-bold text-indigo-600">
            {{ winRate }}
          </div>
        </div>
      </div>
      <div class="flex gap-4 mt-3 text-sm">
        <span class="flex items-center gap-1">
          <span class="inline-block w-3 h-3 bg-green-500" />
          {{ $t('league.profile.totalWins') }}: {{ totalWins }}
        </span>
        <span class="flex items-center gap-1">
          <span class="inline-block w-3 h-3 bg-yellow-500" />
          {{ $t('league.profile.totalDraws') }}: {{ totalDraws }}
        </span>
        <span class="flex items-center gap-1">
          <span class="inline-block w-3 h-3 bg-red-500" />
          {{ $t('league.profile.totalLosses') }}: {{ totalLosses }}
        </span>
      </div>
    </div>

    <!-- Season Summary Table -->
    <div v-if="stats.standings.length > 0" class="mb-6">
      <h3 class="font-bold text-lg mb-3">
        {{ $t('league.profile.seasonSummary') }}
      </h3>
      <div class="shadow overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-indigo-600 text-white">
            <tr>
              <th class="p-2 text-left">
                {{ $t('league.profile.season') }}
              </th>
              <th class="p-2 text-left">
                {{ $t('league.profile.tier') }}
              </th>
              <th class="p-2 text-center">
                {{ $t('league.profile.position') }}
              </th>
              <th class="p-2 text-center">
                {{ $t('league.profile.points') }}
              </th>
              <th class="p-2 text-center">
                {{ $t('league.profile.win') }}
              </th>
              <th class="p-2 text-center">
                {{ $t('league.profile.draw') }}
              </th>
              <th class="p-2 text-center">
                {{ $t('league.profile.loss') }}
              </th>
              <th class="p-2 text-center">
                {{ $t('league.standing.bestMo3') }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="standing in standingsDesc"
              :key="standing.id"
              class="border-t border-gray-200 transition-colors"
              :class="isOnGoingSeason(standing.seasonId) ? 'bg-indigo-50 hover:bg-indigo-100' : 'hover:bg-gray-50'"
            >
              <td class="p-2">
                <NuxtLink :to="`/league/${standing.season.number}`" class="text-blue-500 flex items-center gap-1">
                  S{{ standing.season.number }}
                  <span v-if="isOnGoingSeason(standing.seasonId)" class="inline-block w-2 h-2 bg-green-500 animate-pulse" />
                </NuxtLink>
              </td>
              <td class="p-2" :class="tierBgClass(standing.tier)">
                {{ standing.tier?.name }}
              </td>
              <td class="p-2 text-center font-mono">
                {{ standing.position || '-' }}
              </td>
              <td class="p-2 text-center font-mono font-bold">
                {{ standing.points }}
              </td>
              <td class="p-2 text-center font-mono text-green-600">
                {{ standing.wins }}
              </td>
              <td class="p-2 text-center font-mono text-yellow-600">
                {{ standing.draws }}
              </td>
              <td class="p-2 text-center font-mono text-red-600">
                {{ standing.losses }}
              </td>
              <td class="p-2 text-center font-mono">
                {{ formatResult(standing.bestMo3, 2) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ELO History Chart -->
    <div v-if="stats.eloHistories.length > 0" class="mb-6">
      <h3 class="font-bold text-lg mb-3">
        {{ $t('league.profile.eloHistory') }}
      </h3>
      <div class="h-[400px]">
        <VChart :option="eloChartOption" autoresize />
      </div>
    </div>

    <!-- Points per week timeline -->
    <div v-if="pointsTimeline.length > 0" class="mb-6">
      <h3 class="font-bold text-lg mb-3">
        {{ $t('league.profile.points') }}
      </h3>
      <div class="flex flex-wrap gap-1">
        <div
          v-for="(item, idx) in pointsTimeline"
          :key="idx"
          class="flex flex-col items-center gap-0.5"
        >
          <div
            class="w-8 h-8 flex items-center justify-center text-xs font-bold"
            :class="pointsClass(item.points)"
            :title="`${item.label}: ${pointsLabel(item.points)}`"
          >
            {{ pointsLabel(item.points) }}
          </div>
          <div class="text-[10px] text-gray-400 leading-none whitespace-nowrap">
            {{ item.label }}
          </div>
        </div>
      </div>
    </div>

    <!-- Duel History -->
    <div v-if="duelsBySeason.length > 0" class="mb-6">
      <h3 class="font-bold text-lg mb-3">
        {{ $t('league.profile.duelHistory') }}
      </h3>
      <div v-for="group in duelsBySeason" :key="group.seasonNumber" class="mb-4">
        <button
          class="w-full text-left text-white px-3 py-2 font-semibold flex justify-between items-center cursor-pointer"
          :class="isOnGoingSeason(group.seasonId) ? 'bg-indigo-500 ring-2 ring-indigo-300' : 'bg-indigo-600'"
          @click="toggleSeason(group.seasonNumber)"
        >
          <span class="flex items-center gap-2">
            S{{ group.seasonNumber }} ({{ group.duels.filter(d => d.ended).length }} {{ $t('league.profile.totalDuels').toLowerCase() }})
            <span v-if="isOnGoingSeason(group.seasonId)" class="inline-block w-2 h-2 bg-green-400 animate-pulse" />
          </span>
          <span class="text-xs">{{ expandedSeasons[group.seasonNumber] ? '▲' : '▼' }}</span>
        </button>
        <Transition
          enter-active-class="transition-all duration-300 ease-out overflow-hidden"
          leave-active-class="transition-all duration-200 ease-in overflow-hidden"
          enter-from-class="max-h-0 opacity-0"
          enter-to-class="max-h-[2000px] opacity-100"
          leave-from-class="max-h-[2000px] opacity-100"
          leave-to-class="max-h-0 opacity-0"
        >
          <div v-if="expandedSeasons[group.seasonNumber]" class="shadow overflow-x-auto">
            <table class="w-full text-sm">
              <thead class="bg-gray-100">
                <tr>
                  <th class="p-2 text-left">
                    {{ $t('league.profile.week') }}
                  </th>
                  <th class="p-2 text-left">
                    {{ $t('league.profile.opponent') }}
                  </th>
                  <th class="p-2 text-center">
                    {{ $t('league.profile.score') }}
                  </th>
                  <th class="p-2 text-center">
                    {{ $t('league.profile.result') }}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="duel in group.duels"
                  :key="duel.id"
                  class="border-t border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <td class="p-2 font-mono">
                    W{{ duel.competition ? leagueWeek(duel.competition) : '-' }}
                  </td>
                  <td class="p-2">
                    <NuxtLink v-if="getOpponent(duel, user.id)" :to="`/profile/${userId(getOpponent(duel, user.id)!)}/league`" class="flex items-center gap-1 text-blue-500">
                      <UserAvatarName :user="getOpponent(duel, user.id)!" :link="false" />
                    </NuxtLink>
                    <span v-else class="text-gray-400">BYE</span>
                  </td>
                  <td class="p-2 text-center font-mono">
                    {{ getUserSetPoints(duel, user.id) }} - {{ getOpponentSetPoints(duel, user.id) }}
                  </td>
                  <td class="p-2 text-center">
                    <span
                      class="inline-block w-6 py-0.5 text-center text-xs font-bold"
                      :class="resultBadgeClass(getDuelResult(duel, user.id))"
                    >
                      {{ resultLabel(getDuelResult(duel, user.id)) }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Transition>
      </div>
    </div>

    <!-- Existing charts -->
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
