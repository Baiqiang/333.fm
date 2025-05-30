<script setup lang="ts">
const { t } = useI18n()
const user = useUser()
const { data: nextSession } = await useApi<LeagueSession>('/league/session/next')
useSeoMeta({
  title: t('league.title'),
})
</script>

<template>
  <div>
    <NuxtLink v-if="user.isLeagueAdmin" to="/league/admin" class="text-sm my-2 text-blue-500">
      Admin Panel
    </NuxtLink>
    <LeagueDescription />
    <h1 v-if="nextSession" class="font-bold text-lg md:text-2xl my-2 flex items-center">
      {{ nextSession.title }}
      <Icon name="fxemoji:fire" />
    </h1>
    <LeagueSummary v-if="nextSession" :session="nextSession" />
  </div>
</template>
