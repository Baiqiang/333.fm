<script setup lang="ts">
const session = inject(SYMBOL_LEAGUE_SESSION)!
const { data } = await useApi<LeagueStanding[]>(`/league/session/${session.value.number}/standings`)
const allStandings = ref<LeagueStanding[]>(data.value || [])
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
  const ret = Object.values(tmp).sort((a, b) => a.tier.level.localeCompare(b.tier.level))
  ret.forEach(t => t.standings.sort((a, b) => a.position - b.position))
  return ret
})
useSeoMeta({
  title: `Standings - ${session.value.title}`,
})
function getStandingClass(tierIndex: number, index: number) {
  let ret = ''
  if (index < 3) {
    if (tierIndex === 0) {
      return [
        'bg-[#d4af37]',
        'bg-[#c0c0c0]',
        'bg-[#c79b56]',
      ][index]
    }
    ret = 'bg-green-300'
  }
  if (index > tierStandings.value[0].standings.length - 4) {
    ret = 'bg-red-300'
    if (tierIndex === tierStandings.value.length - 1) {
      ret = ''
    }
  }
  return ret
}
</script>

<template>
  <div>
    <h3 class="text-lg font-bold my-2 w-full">
      Standings
    </h3>
    <div class="grid grid-cols-[max-content_max-content_max-content_2rem_2rem_2rem_max-content] overflow-x-auto">
      <template v-for="{ tier, standings }, tierIndex in tierStandings" :key="tier.id">
        <div class="grid grid-cols-subgrid col-span-full uppercase bg-gray-800 text-white mt-2">
          <div class="p-1">
            {{ tier.name }}
          </div>
          <div class="border-l border-white p-1">
            Competitors
          </div>
          <div class="border-l border-white p-1">
            PTS
          </div>
          <div class="border-l border-white p-1 text-center">
            W
          </div>
          <div class="border-l border-white p-1 text-center">
            D
          </div>
          <div class="border-l border-white p-1 text-center">
            L
          </div>
          <div class="border-l border-white p-1">
            Best Mo3
          </div>
        </div>
        <div v-for="(standing, index) in standings" :key="standing.id" class="grid grid-cols-subgrid col-span-full border-t border-gray-700" :class="getStandingClass(tierIndex, index)">
          <div class="text-right p-1 font-mono">
            No.{{ standing.position || index }}
          </div>
          <UserAvatarName :user="standing.user" class="p-1 border-l border-black" />
          <div class="p-1 border-l border-black text-center font-mono">
            {{ standing.points }}
          </div>
          <div class="p-1 border-l border-black text-center font-mono">
            {{ standing.wins }}
          </div>
          <div class="p-1 border-l border-black text-center font-mono">
            {{ standing.draws }}
          </div>
          <div class="p-1 border-l border-black text-center font-mono">
            {{ standing.losses }}
          </div>
          <div class="p-1 border-l border-black text-center font-mono">
            {{ formatResult(standing.bestMo3, 2) }}
          </div>
        </div>
      </template>
    </div>
  </div>
</template>
