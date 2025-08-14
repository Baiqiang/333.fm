<script setup lang="ts">
const { t } = useI18n()
const user = useUser()
const { data: nextSeason } = await useApi<LeagueSeason>('/league/season/next')
const { data: pastSeasons } = await useApi<LeagueSeason[]>('/league/seasons/past')
useSeoMeta({
  title: t('league.title'),
})
</script>

<template>
  <div>
    <NuxtLink v-if="user.isLeagueAdmin" to="/league/admin" class="text-sm my-2 text-blue-500">
      Admin Panel
    </NuxtLink>
    <div class="grid md:grid-cols-[1fr_max-content] gap-4">
      <div>
        <LeagueDescription />
        <Heading1 v-if="nextSeason" class="flex items-center">
          {{ nextSeason.title }}
          <Icon name="fxemoji:fire" />
        </Heading1>
        <LeagueSummary v-if="nextSeason" :season="nextSeason" />
      </div>
      <div class="bg-white shadow-md p-4 mb-4">
        <h2 class="text-xl font-bold mb-4 text-gray-800 flex items-center gap-2">
          <Icon name="mdi:history" class="text-blue-400" />
          {{ $t('league.pastSeasons') }}
        </h2>
        <ul class="">
          <li v-for="season in pastSeasons" :key="season.id">
            <NuxtLink
              :to="`/league/${season.id}`"
              class="text-blue-500"
            >
              {{ season.title }}
            </NuxtLink>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>
