<script setup lang="ts">
const { t } = useI18n()
const season = inject(SYMBOL_LEAGUE_SEASON)!
const { data } = await useApi<Result[]>(`/league/season/${season.value.number}/solves`)
const allSolves = ref<Result[]>(data.value || [])
const competitionWeeks = computed(() => {
  const ret: Record<number, string> = {}
  season.value.competitions.forEach((competition) => {
    ret[competition.id] = leagueWeek(competition)
  })
  return ret
})
const tierPlayers = computed(() => {
  const allPlayerIds: Record<number, boolean> = {}
  const ret = season.value.tiers.map((tier) => {
    return {
      id: tier.id,
      name: tier.name,
      players: tier.players.map(({ user }) => {
        allPlayerIds[user.id] = true
        return user
      }),
    }
  })
  const unassignedPlayers: Record<number, User> = {}
  for (const { user } of allSolves.value) {
    if (!allPlayerIds[user.id]) {
      unassignedPlayers[user.id] = user
    }
  }
  ret.push({
    ...unassignedTier,
    players: Object.values(unassignedPlayers),
  })
  return ret
})
const mappedSolves = computed(() => {
  const ret: Record<string, Record<string, Result>> = {}
  allSolves.value.forEach((solve) => {
    const week = competitionWeeks.value[solve.competitionId]
    if (!ret[solve.userId]) {
      ret[solve.userId] = {}
    }
    ret[solve.userId][week] = solve
  })
  return ret
})
const maxWeek = computed(() => {
  return season.value.competitions.filter(c => isInStatus(c, CompetitionStatus.ENDED)).length
})
useSeoMeta({
  title: `${t('league.nav.statistics')} - ${season.value.title}`,
})
</script>

<template>
  <div class="px-2 overflow-x-auto w-full">
    <Heading1>
      {{ $t('league.nav.statistics') }}
    </Heading1>
    <div class="shadow overflow-x-auto w-full h-screen overflow-y-auto mb-4">
      <div class="grid grid-cols-[max-content_max-content_max-content_1fr]">
        <div class="grid grid-cols-subgrid col-span-full bg-indigo-600 text-white sticky top-0 z-10">
          <div class="p-2 font-semibold tracking-wide text-center content-center">
            {{ $t('league.statistics.tier') }}
          </div>
          <div class="border-l border-r border-indigo-400 p-2 font-medium md:sticky left-0 bg-indigo-600 content-center">
            {{ $t('league.standing.competitors') }}
          </div>
          <div class="p-2 font-medium content-center">
            {{ $t('league.standing.bestMo3') }}
          </div>
          <div v-if="maxWeek > 0" class="font-medium flex">
            <div v-for="week in maxWeek" :key="week" class="border-l border-indigo-400 text-center w-44">
              <div class="border-b border-indigo-400 p-2">
                Week {{ week }}
              </div>
              <div class="flex">
                <div class="w-14 border-l border-indigo-400 p-2">
                  {{ $t('result.mean') }}
                </div>
                <div v-for="i in 3" :key="i" class="w-10 border-l border-indigo-400 p-2">
                  A{{ i }}
                </div>
              </div>
            </div>
          </div>
        </div>
        <template v-for="{ id, name, players }, index in tierPlayers" :key="id">
          <div class="border-t border-gray-200 content-center text-center px-2" :style="{ gridRow: `span ${players.length}` }" :class="tierBackgrounds[index]">
            {{ name }}
          </div>
          <div
            v-for="player in players"
            :key="player.id"
            class="grid grid-cols-subgrid col-span-3 border-t border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <UserAvatarName :user="player" class="p-2 border-l border-r border-gray-200 md:sticky left-0 bg-gray-50" />
            <ColoredMoves
              class="p-2 text-center font-mono font-bold"
              :value="Math.min(...Object.values(mappedSolves[player.id] || {}).map(s => s.average))"
              placeholder="-"
              is-mean
            />
            <div v-if="maxWeek > 0" class="text-center font-mono flex">
              <template v-for="week in maxWeek" :key="week">
                <ColoredMoves
                  class="w-14 border-l text-center py-2 bg-gray-200"
                  :value="mappedSolves[player.id]?.[week]?.average"
                  placeholder="-"
                  is-mean
                />
                <ColoredMoves
                  v-for="value in mappedSolves[player.id]?.[week]?.values || [0, 0, 0]"
                  :key="value"
                  class="w-10 border-l text-center p-2"
                  :value="value"
                  placeholder="-"
                />
              </template>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>
