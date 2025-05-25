<script setup lang="ts">
defineProps<{
  tierSchedules: TierSchedule[]
}>()
</script>

<template>
  <LeagueScheduleWrapper>
    <LeagueTierSchedules v-for="{ tier, schedules } in tierSchedules" :key="tier.id" :tier="tier" :schedules="schedules" />
  </LeagueScheduleWrapper>
</template>
