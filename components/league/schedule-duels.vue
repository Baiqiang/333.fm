<script setup lang="ts">
const props = defineProps<{
  duels: LeagueDuel[]
  competition: Competition
}>()
const ended = computed(() => props.competition.status === CompetitionStatus.ENDED)
</script>

<template>
  <LeagueScheduleDuel v-for="duel of duels" :key="duel.id" :duel="duel" :ended="ended" />
</template>
