<script setup lang="ts">
const { t } = useI18n()
const session = inject(SYMBOL_LEAGUE_SESSION)!
const { data } = await useApi<TierSchedule[]>(`/league/session/${session.value.number}/schedules`)
const tierSchedules = ref<TierSchedule[]>(data.value || [])
useSeoMeta({
  title: `${t('league.nav.schedules')} - ${session.value.title}`,
})
</script>

<template>
  <div class="px-2">
    <Heading1>
      {{ $t('league.nav.schedules') }}
    </Heading1>
    <LeagueSchedules :tier-schedules="tierSchedules" />
  </div>
</template>
