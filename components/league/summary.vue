<script setup lang="ts">
const props = defineProps<{
  session: LeagueSession
}>()

const currentWeek = computed(() => props.session.competitions.find(c => c.status === CompetitionStatus.ON_GOING))
const pastWeeks = computed(() => props.session.competitions.filter(c => c.status === CompetitionStatus.ENDED))
const futureWeeks = computed(() => props.session.competitions.filter(c => c.status === CompetitionStatus.NOT_STARTED))
</script>

<template>
  <div class="">
    <div v-if="currentWeek">
      <h2 class="font-bold my-2">
        Week {{ currentWeek?.alias.split('-')[2] }}
      </h2>
      <WeeklySummary :competition="currentWeek" />
    </div>
    <div v-if="pastWeeks.length > 0">
      <h2 class="font-bold my-2">
        Past Weeks
      </h2>
      <div class="flex flex-col gap-2">
        <CompetitionName v-for="week in pastWeeks" :key="week.id" :competition="week" />
      </div>
    </div>
    <div v-if="futureWeeks.length > 0">
      <h2 class="font-bold my-2">
        Future Weeks
      </h2>
      <div class="flex flex-col gap-2">
        <CompetitionName v-for="week in futureWeeks" :key="week.id" :competition="week" />
      </div>
    </div>
  </div>
</template>
