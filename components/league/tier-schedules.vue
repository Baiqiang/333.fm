<script setup lang="ts">
const props = defineProps<{
  tier: LeagueTier
  schedules: LeagueDuel[]
}>()
const grouppedSchedules = computed(() => {
  const tmp: Record<string, { competition: Competition, duels: LeagueDuel[] }> = {}
  for (const schedule of props.schedules) {
    const week = leagueWeek(schedule.competition)
    tmp[week] = tmp[week] || {
      competition: schedule.competition,
      duels: [],
    }
    tmp[week].duels.push(schedule)
  }
  return Object.values(tmp)
})
</script>

<template>
  <h4 v-if="schedules.length > 0" class="font-bold px-2 col-span-full text-lg">
    {{ tier.name }}
  </h4>
  <template v-for="{ competition, duels } of grouppedSchedules" :key="competition.id">
    <div class="col-span-5 col-start-5 grid grid-cols-subgrid mt-2">
      <div class="col-span-4 flex items-center bg-indigo-50 border border-r-0 border-indigo-200 p-2 shadow-sm">
        <div class="font-semibold text-indigo-700 mr-3">
          Week {{ leagueWeek(competition) }}
        </div>
        <div class="text-sm text-indigo-600">
          {{ $dayjs(competition.startTime).format('MMM Do') }}-{{ $dayjs(competition.endTime).format('MMM Do') }}
        </div>
      </div>
      <div class="border-l border-indigo-200" />
    </div>
    <LeagueScheduleTitle />
    <LeagueScheduleDuels :duels="duels" :competition="competition" />
  </template>
</template>
