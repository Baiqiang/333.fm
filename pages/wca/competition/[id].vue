<script setup lang="ts">
const config = useRuntimeConfig().public
const route = useRoute()
const { t } = useI18n()

const wcaCompetitionsCache = useWCACompetitionsCache()
const wcaCompetition = ref<WCACompetition | null>(wcaCompetitionsCache.competitions[route.params.id as string] ?? null)
if (!wcaCompetition.value) {
  // fetch from WCA
  const { data, error } = await useApi<WCACompetition>(`${config.wca.apiBaseURL}/competitions/${route.params.id}`)
  if (error.value || !data.value) {
    throw createError({
      statusCode: 404,
      statusMessage: t('error.wca.competitionNotFound'),
    })
  }
  wcaCompetition.value = data.value
}

const { data: liveData, error, refresh } = await useAsyncQuery<{ competitions: { id: string, name: string }[] }>(WCA_LIVE_COMPETITIONS_QUERY, {
  filter: wcaCompetition.value.name,
})

await refresh()

if (error.value || !liveData.value || liveData.value.competitions.length === 0) {
  throw createError({
    statusCode: 404,
    statusMessage: t('error.wca.competitionNotFound'),
  })
}

const { result } = useQuery<{
  competition: WCALiveCompetition
}>(WCA_LIVE_COMPETITION_QUERY, {
  id: liveData.value.competitions[0].id,
})
const liveCompetition = computed(() => result.value?.competition)
provide(SYMBOL_WCA_LIVE_COMPETITION, liveCompetition)
useSeoMeta({
  title: computed(() => `${liveCompetition.value?.name} - WCA Live`),
})
</script>

<template>
  <div>
    <BackTo to="/wca/competitions" :label="$t('wca.competitions')" />
    <NuxtPage />
  </div>
</template>
