<script setup lang="ts">
const config = useRuntimeConfig().public
const route = useRoute()
const { t } = useI18n()

const wcaCompetitionId = computed(() => route.params.id as string)
const isPersonPage = computed(() => !!route.params.uId)

const wcaCompetitionsCache = useWCACompetitionsCache()
const wcaCompetition = ref<WCACompetition | null>(wcaCompetitionsCache.competitions[wcaCompetitionId.value] ?? null)
if (!wcaCompetition.value) {
  const { data, error } = await useApi<WCACompetition>(`${config.wca.apiBaseURL}/competitions/${wcaCompetitionId.value}`)
  if (error.value || !data.value) {
    throw createError({
      statusCode: 404,
      statusMessage: t('error.wca.competitionNotFound'),
    })
  }
  wcaCompetition.value = data.value
}

provide(SYMBOL_WCA_COMPETITION, computed(() => wcaCompetition.value!))

const backTo = computed(() => isPersonPage.value
  ? `/wca/reconstruction/${wcaCompetitionId.value}`
  : `/wca/competition/${wcaCompetitionId.value}`,
)
const backLabel = computed(() => isPersonPage.value
  ? t('wca.recon.title')
  : (wcaCompetition.value?.name ?? ''),
)

useSeoMeta({
  title: computed(() => `${t('wca.recon.title')} - ${wcaCompetition.value?.name}`),
})
</script>

<template>
  <div>
    <BackTo :to="backTo" :label="backLabel" />
    <NuxtPage />
  </div>
</template>
