<script setup lang="ts">
const route = useRoute()

const wcaCompetition = ref<WCACompetition>(await useWCACompetition(() => route.params.id as string))

provide(SYMBOL_WCA_COMPETITION, computed(() => wcaCompetition.value))

const { data: liveData, refresh } = await useAsyncQuery<{ competitions: { id: string, name: string }[] }>(WCA_LIVE_COMPETITIONS_QUERY, {
  filter: wcaCompetition.value.name,
})

await refresh()

const hasLiveData = computed(() => !!liveData.value?.competitions?.length)

let liveCompetition: Ref<WCALiveCompetition | undefined>
if (hasLiveData.value) {
  const { data: liveCompetitionData, refresh: refreshLiveCompetition } = await useAsyncQuery<{
    competition: WCALiveCompetition
  }>(WCA_LIVE_COMPETITION_QUERY, {
    id: liveData.value!.competitions[0].id,
  })
  await refreshLiveCompetition()
  liveCompetition = computed(() => liveCompetitionData.value?.competition)
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
