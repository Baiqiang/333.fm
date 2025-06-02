<script setup lang="ts">
const { t } = useI18n()
const session = inject(SYMBOL_LEAGUE_SESSION)!
const { data } = await useApi<LeagueStanding[]>(`/league/session/${session.value.number}/standings`)
const { data: data2 } = await useApi<LeagueResult[]>(`/league/session/${session.value.number}/results`)
const allStandings = ref<LeagueStanding[]>(data.value || [])
const allResults = ref<LeagueResult[]>(data2.value || [])
const tierStandings = computed(() => {
  const tmp: Record<string, {
    tier: LeagueTier
    standings: LeagueStanding[]
  }> = {}
  allStandings.value.forEach((standing) => {
    if (!tmp[standing.tier.id]) {
      tmp[standing.tier.id] = {
        tier: standing.tier,
        standings: [],
      }
    }
    tmp[standing.tier.id].standings.push(standing)
  })
  const ret = Object.values(tmp).sort((a, b) => a.tier.level - b.tier.level)
  ret.forEach(t => t.standings.sort((a, b) => a.position - b.position))
  return ret
})
const maxWeek = computed(() => {
  return Math.max(...allResults.value.map(r => r.week))
})
const tierResults = computed(() => {
  const ret: Record<string, Record<number, LeagueResult>> = {}
  allResults.value.forEach((result) => {
    if (!ret[result.userId]) {
      ret[result.userId] = {}
    }
    ret[result.userId][result.week] = result
  })
  return ret
})
useSeoMeta({
  title: `${t('league.nav.standings')} - ${session.value.title}`,
})
function getStandingClass(tierIndex: number, index: number) {
  let ret = ''
  if (index < 3) {
    if (tierIndex === 0) {
      return [
        'bg-gradient-to-r from-[#ffd700] to-[#d4af37] text-white',
        'bg-gradient-to-r from-[#c0c0c0] to-[#a8a8a8] text-white',
        'bg-gradient-to-r from-[#cd7f32] to-[#c79b56] text-white',
      ][index]
    }
    ret = 'bg-gradient-to-r from-green-300 to-green-200'
  }
  if (index > tierStandings.value[0].standings.length - 4) {
    ret = 'bg-gradient-to-r from-red-300 to-red-200'
    if (tierIndex === tierStandings.value.length - 1) {
      ret = ''
    }
  }
  return ret
}
function getResultClass(points?: number) {
  switch (points) {
    case 2:
      return 'bg-gradient-to-r from-green-500 to-green-400 text-white font-bold'
    case 1:
      return 'bg-gradient-to-r from-yellow-500 to-yellow-400 text-white font-bold'
    default:
      return 'bg-gradient-to-r from-red-500 to-red-400 text-white font-bold'
  }
}
</script>

<template>
  <div class="px-2">
    <h3 class="text-2xl font-bold my-4 text-gray-900">
      {{ $t('league.nav.standings') }}
    </h3>
    <div class="shadow">
      <div class="grid grid-cols-[max-content_max-content_max-content_2rem_2rem_2rem_max-content_1fr] overflow-x-auto">
        <template v-for="{ tier, standings }, tierIndex in tierStandings" :key="tier.id">
          <div class="grid grid-cols-subgrid col-span-full bg-gradient-to-r from-indigo-600 to-indigo-500 text-white mt-1 first:mt-0">
            <div class="p-2 font-semibold tracking-wide">
              {{ tier.name }}
            </div>
            <div class="border-l border-indigo-400 p-2 font-medium">
              {{ $t('league.standing.competitors') }}
            </div>
            <div class="border-l border-indigo-400 p-2 font-medium">
              {{ $t('league.standing.pts') }}
            </div>
            <div class="border-l border-indigo-400 p-2 text-center font-medium">
              {{ $t('league.standing.wins') }}
            </div>
            <div class="border-l border-indigo-400 p-2 text-center font-medium">
              {{ $t('league.standing.draws') }}
            </div>
            <div class="border-l border-indigo-400 p-2 text-center font-medium">
              {{ $t('league.standing.losses') }}
            </div>
            <div class="border-l border-indigo-400 p-2 font-medium text-xs w-16 break-words leading-none text-center">
              {{ $t('league.standing.bestMo3') }}
            </div>
            <div v-if="maxWeek > 0" class="font-medium">
              <div v-for="week in maxWeek" :key="week" class="w-10 border-l border-indigo-400 text-center p-2">
                W{{ week }}
              </div>
            </div>
          </div>
          <div
            v-for="(standing, index) in standings"
            :key="standing.id"
            class="grid grid-cols-subgrid col-span-full border-t border-gray-200 hover:bg-gray-50 transition-colors"
            :class="getStandingClass(tierIndex, index)"
          >
            <div class="text-right p-2 font-mono font-semibold">
              No.{{ standing.position || index + 1 }}
            </div>
            <UserAvatarName :user="standing.user" class="p-2 border-l border-gray-200" />
            <div class="p-2 border-l border-gray-200 text-center font-mono font-bold">
              {{ standing.points }}
            </div>
            <div class="p-2 border-l border-gray-200 text-center font-mono">
              {{ standing.wins }}
            </div>
            <div class="p-2 border-l border-gray-200 text-center font-mono">
              {{ standing.draws }}
            </div>
            <div class="p-2 border-l border-gray-200 text-center font-mono">
              {{ standing.losses }}
            </div>
            <div class="p-2 border-l border-gray-200 text-center font-mono">
              {{ formatResult(standing.bestMo3, 2) }}
            </div>
            <div v-if="maxWeek > 0" class="text-center font-mono">
              <div v-for="week in maxWeek" :key="week" class="w-10 border-l border-gray-200 text-center p-2" :class="getResultClass(tierResults[standing.userId]?.[week]?.points)">
                {{ tierResults[standing.userId]?.[week]?.points || 0 }}
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>
