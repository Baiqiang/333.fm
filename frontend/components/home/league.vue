<script setup lang="ts">
const props = defineProps<{
  league?: LeagueSeason | null
}>()
const onGoingWeek = computed(() => props.league?.competitions.find(c => isInStatus(c, CompetitionStatus.ON_GOING)))
</script>

<template>
  <HomeCompetition
    v-if="league && onGoingWeek"
    :competition="onGoingWeek"
    :title="`${league.title} · Week ${leagueWeek(onGoingWeek)}`"
    icon="mdi:trophy"
    hide-cube
    wide
  />
  <HomeCard v-else :title="league?.title ?? $t('league.title')" icon="mdi:trophy" :to="league ? `/league/${league.number}` : '/league'">
    <template #actions>
      <HomeMoreLink to="/league" />
    </template>
    <LeagueDescription v-if="league" class="text-sm text-gray-600" />
    <p v-else class="text-sm text-gray-600">
      {{ $t('home.leagueBreak') }}
    </p>
  </HomeCard>
</template>
