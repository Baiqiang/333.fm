<script setup lang="ts">
const { t } = useI18n()
const season = inject(SYMBOL_LEAGUE_SEASON)!
const { data } = await useApi<TierSchedule[]>(`/league/season/${season.value.number}/schedules`)
const tierSchedules = ref<TierSchedule[]>(data.value || [])
useSeoMeta({
  title: `${t('league.nav.schedules')} - ${season.value.title}`,
})
</script>

<template>
  <div class="px-2">
    <Heading1>
      {{ $t('league.nav.schedules') }}
    </Heading1>
    <LeagueSchedules :tier-schedules="tierSchedules" tab />
  </div>
</template>
