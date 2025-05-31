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
  <div>
    <h3 class="text-lg font-bold my-2 w-full">
      {{ $t('league.nav.schedules') }}
    </h3>
    <LeagueSchedules :tier-schedules="tierSchedules" />
  </div>
</template>
