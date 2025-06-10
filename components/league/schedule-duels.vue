<script setup lang="ts">
const props = defineProps<{
  duels: LeagueDuel[]
  competition: Competition
}>()
const ended = computed(() => isInStatus(props.competition, CompetitionStatus.ENDED))
</script>

<template>
  <LeagueScheduleDuel v-for="duel of duels" :key="duel.id" :duel="duel" :ended="ended" />
</template>
