<script setup lang="ts">
defineProps<{
  competition: Competition
}>()
</script>

<template>
  <div v-if="competition.prevCompetition || competition.nextCompetition" class="flex justify-between my-4 text-sm">
    <ButtonPrimary v-if="competition.prevCompetition" :to="competitionPath(competition.prevCompetition)">
      {{ $t('weekly.previous') }}
    </ButtonPrimary>
    <div v-else />
    <ButtonPrimary v-if="competition.nextCompetition" :to="competitionPath(competition.nextCompetition)">
      {{ $t('weekly.next') }}
    </ButtonPrimary>
    <div v-else />
  </div>
</template>
