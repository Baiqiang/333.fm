<script setup lang="ts">
const props = defineProps<{
  competition: Competition
  scramble: Scramble
}>()
const competitionLink = computed(() => {
  switch (props.competition.type) {
    case CompetitionType.WEEKLY:
      return `/weekly/${props.competition.alias}#scramble-${props.scramble.number}`
    case CompetitionType.ENDLESS:
      if (props.scramble.scramble)
        return `/endless/${props.competition.alias}/${props.scramble.number}`

      return `/endless/${props.competition.alias}`
    default:
      return `/competition/${props.competition.alias}`
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
