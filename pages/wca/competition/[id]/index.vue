<script setup lang="ts">
import type { UseQueryReturn } from '@vue/apollo-composable'

const liveCompetition = inject(SYMBOL_WCA_LIVE_COMPETITION)
const events = computed(() => (liveCompetition?.value?.competitionEvents ?? []).filter(event => event.event.id === '333fm'))
const rounds = computed(() => events.value[0]?.rounds ?? [])
const roundsResults = reactive<Record<string, WCALiveRound>>({})
onMounted(async () => {
  await fetchRoundsResults()
})
useIntervalFn(fetchRoundsResults, 1000)
async function fetchRoundsResults() {
  await Promise.all(rounds.value.map(async (round) => {
    const { data } = await useAsyncQuery<{ round: WCALiveRound }>(WCA_LIVE_ROUND_QUERY, { id: round.id })
    if (!data.value?.round)
      return
    roundsResults[round.id] = data.value.round
  }))
}
</script>

<template>
  <Loading v-if="!liveCompetition" />
  <div v-else>
    <h1 class="text-3xl font-bold my-2">
      {{ liveCompetition.name }}
    </h1>
    <div class="flex items-center gap-1 text-sm">
      <a :href="`https://www.worldcubeassociation.org/competitions/${liveCompetition.wcaId}`" target="_blank" class="text-blue-500">
        WCA Website
      </a>
      |
      <a :href="`https://live.worldcubeassociation.org/competitions/${liveCompetition.id}`" target="_blank" class="text-blue-500">
        WCA Live
      </a>
    </div>
    <Tabs>
      <Tab v-for="round in rounds" :key="round.id" :name="round.name">
        <Loading v-if="!roundsResults[round.id]" />
        <div v-else class="mb-6 p-4 bg-gray-50 shadow w-full overflow-x-auto">
          <WcaLiveResults :results="roundsResults[round.id].results" />
        </div>
      </Tab>
    </Tabs>
  </div>
</template>
