<script setup lang="ts">
const { t } = useI18n()
const user = useUser()
const { data: nextSeason } = await useApi<LeagueSeason>('/league/season/next')
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
    <Heading1 v-if="nextSeason" class="flex items-center">
      {{ nextSeason.title }}
      <Icon name="fxemoji:fire" />
    </Heading1>
    <LeagueSummary v-if="nextSeason" :season="nextSeason" />
  </div>
</template>
