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
  ret.forEach(t => t.standings.sort((a, b) => {
    let tmp = a.points - b.points
    if (tmp === 0) {
      tmp = a.wins - b.wins
    }
    if (tmp === 0) {
      tmp = a.draws - b.draws
    }
    if (tmp === 0) {
      tmp = b.losses - a.losses
    }
    if (tmp === 0) {
      tmp = b.bestMo3 - a.bestMo3
    }
    return -tmp
  }))
  return ret
})
useSeoMeta({
  title: `Standings - ${session.value.title}`,
})
</script>

<template>
  <div>
    <h3 class="text-lg font-bold my-2 w-full">
      Standings
    </h3>
    <div class="grid grid-cols-[max-content_max-content_max-content_max-content_max-content_max-content_max-content]">
      <template v-for="{ tier, standings } in tierStandings" :key="tier.id">
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
          <div class="border-l border-white p-1">
            Wins
          </div>
          <div class="border-l border-white p-1">
            Draws
          </div>
          <div class="border-l border-white p-1">
            Losses
          </div>
          <div class="border-l border-white p-1">
            Best Mo3
          </div>
        </div>
        <div v-for="(standing, index) in standings" :key="standing.id" class="grid grid-cols-subgrid col-span-full odd:bg-gray-300">
          <div class="text-right p-1 font-mono">
            No.{{ index + 1 }}
          </div>
          <UserAvatarName :user="standing.user" class="p-1" />
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
