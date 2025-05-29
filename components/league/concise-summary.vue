<script setup lang="ts">
const props = defineProps<{
  league?: LeagueSession | null
}>()
const onGoingWeek = computed(() => props.league?.competitions.find(c => c.status === CompetitionStatus.ON_GOING))
</script>

<template>
  <div v-if="league" class="bg-white shadow-md p-4 border-l-4 border-indigo-500 mb-4">
    <h2 class="text-2xl font-bold mb-4">
      <NuxtLink :to="`/league/${league.number}`" class="flex items-center gap-2 hover:text-blue-500">
        <Icon name="mdi:trophy" />
        {{ league.title }}
        <Icon name="fxemoji:fire" class="animate-bounce" />
      </NuxtLink>
    </h2>
    <LeagueDescription class="text-gray-600" />
    <div v-if="onGoingWeek" class="mt-4">
      <h3 class="text-xl font-bold flex items-center gap-2 mb-4">
        <Icon name="mdi:calendar-week" />
        Week {{ leagueWeek(onGoingWeek) }}
      </h3>
      <WeeklySummary :competition="onGoingWeek" :show-cube="false" />
    </div>
  </div>
</template>
