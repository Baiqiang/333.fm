<script setup lang="ts">
const { t } = useI18n()
const { number } = useRoute().params
const { data, error } = await useApi<LeagueSeason>(`/league/season/${number}`)
if (error.value || !data.value) {
  throw createError({
    statusCode: 404,
    statusMessage: t('league.error.season_not_found'),
  })
}

const season = ref(data.value)
provide(SYMBOL_LEAGUE_SEASON, season)
</script>

<template>
  <div class="md:grid md:grid-cols-[12rem_1fr] md:gap-2">
    <!-- 左侧导航 -->
    <LeagueNav :season="season" />

    <!-- 主要内容区域 -->
    <NuxtPage />
  </div>
</template>
