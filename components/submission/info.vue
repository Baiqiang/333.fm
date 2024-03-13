<script setup lang="ts">
const props = defineProps<{
  submission: Submission
}>()
const { competition, scramble } = toRefs(props.submission)
const competitionLink = computed(() => {
  const submission = props.submission
  const { competition, scramble } = submission
  switch (competition.type) {
    case CompetitionType.WEEKLY:
      return `/weekly/${competition.alias}#scramble-${scramble.number}`
    case CompetitionType.ENDLESS:
      if (!submission.hideSolution)
        return `/endless/${competition.alias}/${scramble.number}`

      return `/endless/${competition.alias}`
    case CompetitionType.FMC_CHAIN:
      if (submission.parentId === null)
        return `/chain/${scramble.number}`
      return `/chain/${scramble.number}/${submission.parentId}`
    default:
      return `/competition/${competition.alias}`
  }
})
</script>

<template>
  <div class="flex gap-x-2 flex-wrap">
    <NuxtLink :to="competitionLink" class="text-blue-500 hover:text-blue-300">
      {{ competition.name }}
    </NuxtLink>
    <div v-if="competition.type === CompetitionType.WEEKLY">
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
