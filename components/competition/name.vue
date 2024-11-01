<script setup lang="ts">
const props = defineProps<{
  competition: Competition
  scramble?: { number: number }
  submission?: Submission
}>()
const { t, locale } = useI18n()
const competitionIndex = computed(() => props.competition.alias.split('-').pop())
const competitionLink = computed(() => {
  const { competition, scramble, submission } = props
  return competitionPath(competition, scramble, submission)
})
const competitionName = computed(() => {
  const { competition } = props
  switch (competition.type) {
    case CompetitionType.WEEKLY:
      return `${t('weekly.title')} ${competition.alias}`
    case CompetitionType.PERSONAL_PRACTICE:
      return t('practice.user.index', { name: localeName(competition.user.name, locale.value), index: competitionIndex.value })
    default:
      return competition.name
  }
})
</script>

<template>
  <NuxtLink :to="competitionLink" class="text-blue-500 hover:text-blue-300">
    {{ competitionName }}
  </NuxtLink>
</template>
