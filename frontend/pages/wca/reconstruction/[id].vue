<script setup lang="ts">
const route = useRoute()
const { t } = useI18n()

const wcaCompetitionId = computed(() => route.params.id as string)
const isPersonPage = computed(() => !!route.params.uId)

const wcaCompetition = ref<WCACompetition>(await useWCACompetition(wcaCompetitionId))

provide(SYMBOL_WCA_COMPETITION, computed(() => wcaCompetition.value))

const hasPreviousRoute = ref(false)
if (import.meta.client) {
  hasPreviousRoute.value = !!window.history.state?.back
}
const useBackNavigation = computed(() => isPersonPage.value && hasPreviousRoute.value)

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
    <BackTo :to="backTo" :label="backLabel" :back="useBackNavigation" />
    <NuxtPage />
  </div>
</template>
