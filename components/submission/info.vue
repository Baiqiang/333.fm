<script setup lang="ts">
const props = defineProps<{
  submission: Submission
}>()
const { t, locale } = useI18n()
const { competition, scramble } = toRefs(props.submission)
const competitionIndex = computed(() => competition.value.alias.split('-').pop())
const competitionLink = computed(() => {
  const submission = props.submission
  const { competition, scramble } = submission
  return competitionPath(competition, scramble, submission)
})
const competitionName = computed(() => {
  const { competition } = props.submission
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
  <div class="flex gap-x-2 flex-wrap">
    <NuxtLink :to="competitionLink" class="text-blue-500 hover:text-blue-300">
      {{ competitionName }}
    </NuxtLink>
    <div v-if="competition.type === CompetitionType.WEEKLY || competition.type === CompetitionType.PERSONAL_PRACTICE">
      {{ $t('weekly.scramble', { number: scramble.number }) }}
    </div>
    <div v-else-if="competition.type === CompetitionType.ENDLESS">
      {{ $t('endless.level', { level: scramble.number }) }}
    </div>
  </div>
  <template v-if="scramble.scramble">
    <div class="text-sm text-gray-600">
      {{ $t('if.scramble.label') }}
    </div>
    <Sequence :sequence="scramble.scramble" />
  </template>
</template>
