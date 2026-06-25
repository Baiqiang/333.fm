<script setup lang="ts">
const props = defineProps<{
  competition: Competition
  scramble?: { number: number, roundNumber?: number }
  submission?: Submission
}>()
const { t, locale } = useI18n()
const competitionLink = computed(() => {
  const { competition, scramble, submission } = props
  return competitionPath(competition, scramble, submission)
})
const name = computed(() => {
  const { competition, scramble } = props
  return competitionName(competition, scramble)
})
</script>

<template>
  <NuxtLink :to="competitionLink" class="text-blue-500 hover:text-blue-300">
    {{ name }}
    <slot v-if="$slots.default" />
  </NuxtLink>
</template>
