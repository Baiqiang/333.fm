<script setup lang="ts">
const { number } = useRoute().params
const { data, error } = await useApi<LeagueSession>(`/league/session/${number}`)
if (error.value || !data.value) {
  throw createError({
    statusCode: 404,
    statusMessage: 'Session not found',
  })
}

const session = ref(data.value)
provide(SYMBOL_LEAGUE_SESSION, session)
</script>

<template>
  <div>
    <LeagueNav :session="session" />
    <NuxtPage />
  </div>
</template>
