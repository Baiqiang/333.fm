<script setup lang="ts">
const { t } = useI18n()
const { number } = useRoute().params
const { data, error } = await useApi<LeagueSession>(`/league/session/${number}`)
if (error.value || !data.value) {
  throw createError({
    statusCode: 404,
    statusMessage: t('league.error.session_not_found'),
  })
}

const session = ref(data.value)
provide(SYMBOL_LEAGUE_SESSION, session)
</script>

<template>
  <div class="md:grid md:grid-cols-[12rem_1fr] md:gap-2">
    <!-- 左侧导航 -->
    <LeagueNav :session="session" />

    <!-- 主要内容区域 -->
    <NuxtPage />
  </div>
</template>
