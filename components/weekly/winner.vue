<script setup lang="ts">
const props = defineProps<{
  competition: PastCompetition
}>()
const dayjs = useDayjs()
const week = computed(() => dayjs(props.competition.startTime).format('YYYY-ww'))
const { locale } = useI18n()
const name = computed(() => {
  const matches = props.competition.winner.user.name.match(/^(.+?) \((.+)\)$/)
  if (!matches)
    return props.competition.winner.user.name

  return locale.value === 'en' ? matches[1] : matches[2]
})
</script>

<template>
  <div>
    <NuxtLink :to="`/weekly/${week}`" class="text-blue-500 flex items-center">
      <h3 class="font-bold text-lg my-2">
        {{ competition.name }}
      </h3>
      <Icon name="solar:double-alt-arrow-right-linear" size="16" />
    </NuxtLink>
    <div>
      {{ name }} {{ formatResult(competition.winner.average, 2) }} ({{ competition.winner.values.map(formatResult).join(',') }})
    </div>
  </div>
</template>
