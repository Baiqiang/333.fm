<script setup lang="ts">
const props = defineProps<{
  competition: Competition
}>()
const dayjs = useDayjs()
const dateRange = computed(() => {
  const start = dayjs(props.competition.startTime).format('YYYY-MM-DD')
  const end = props.competition.endTime ? dayjs(props.competition.endTime).format('YYYY-MM-DD') : ''
  return end ? `${start} ~ ${end}` : start
})
const typeLabels: Record<number, string> = {
  [CompetitionType.WEEKLY]: 'Weekly',
  [CompetitionType.DAILY]: 'Daily',
  [CompetitionType.ENDLESS]: 'Endless',
  [CompetitionType.LEAGUE]: 'League',
  [CompetitionType.PERSONAL_PRACTICE]: 'Practice',
  [CompetitionType.FMC_CHAIN]: 'Chain',
  [CompetitionType.WCA_RECONSTRUCTION]: 'WCA',
}
</script>

<template>
  <NuxtLink :to="competition.url" class="block p-3 bg-white shadow-xs hover:shadow-md transition-all duration-200">
    <div class="flex items-center gap-2">
      <span class="font-medium">{{ competition.name }}</span>
      <span class="text-xs bg-indigo-100 text-indigo-600 px-2 py-0.5">
        {{ typeLabels[competition.type] || 'Other' }}
      </span>
    </div>
    <div class="text-sm text-gray-500 mt-1">
      {{ dateRange }}
    </div>
  </NuxtLink>
</template>
