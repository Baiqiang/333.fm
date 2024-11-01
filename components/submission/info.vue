<script setup lang="ts">
const props = defineProps<{
  submission: Submission
}>()
const { competition, scramble } = toRefs(props.submission)
</script>

<template>
  <div class="flex gap-x-2 flex-wrap">
    <CompetitionName :competition="competition" :scramble="scramble" :submission="submission" />
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
