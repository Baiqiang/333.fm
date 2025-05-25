<script setup lang="ts">
const { t } = useI18n()
const { data: nextSession } = await useApi<LeagueSession>('/league/session/next')
useSeoMeta({
  title: t('league.title'),
})
</script>

<template>
  <div>
    <div class="my-2">
      The competition is played in the form of a league, where each competitor plays every other competitor in the form of head-to-head matches (one per week).
    </div>
    <h1 v-if="nextSession" class="font-bold text-lg md:text-2xl my-2">
      {{ nextSession.title }}
    </h1>
    <LeagueSummary v-if="nextSession" :session="nextSession" />
  </div>
</template>
