<script setup lang="ts">
const config = useRuntimeConfig().public
const route = useRoute()
const { t } = useI18n()

const wcaCompetitionsCache = useWCACompetitionsCache()
const wcaCompetition = ref<WCACompetition | null>(wcaCompetitionsCache.competitions[route.params.id as string] ?? null)
if (!wcaCompetition.value) {
  const { data, error } = await useApi<WCACompetition>(`${config.wca.apiBaseURL}/competitions/${route.params.id}`)
  if (error.value || !data.value) {
    throw createError({
      statusCode: 404,
      statusMessage: t('error.wca.competitionNotFound'),
    })
  }
  wcaCompetition.value = data.value
}

provide(SYMBOL_WCA_COMPETITION, computed(() => wcaCompetition.value!))

const { data: liveData, refresh } = await useAsyncQuery<{ competitions: { id: string, name: string }[] }>(WCA_LIVE_COMPETITIONS_QUERY, {
  filter: wcaCompetition.value.name,
})

await refresh()

const hasLiveData = computed(() => !!liveData.value?.competitions?.length)

let liveCompetition: Ref<WCALiveCompetition | undefined>
if (hasLiveData.value) {
  const { result } = useQuery<{
    competition: WCALiveCompetition
  }>(WCA_LIVE_COMPETITION_QUERY, {
    id: liveData.value!.competitions[0].id,
  })
  liveCompetition = computed(() => result.value?.competition)
}
else {
  liveCompetition = ref(undefined)
}

provide(SYMBOL_WCA_LIVE_COMPETITION, liveCompetition)
useSeoMeta({
  title: computed(() => `${liveCompetition.value?.name ?? wcaCompetition.value?.name} - WCA`),
})
</script>

<template>
  <div>
    <BackTo to="/wca/competitions" :label="$t('wca.competitions')" />
    <NuxtPage />
  </div>
</template>
