<script setup lang="ts">
const props = defineProps<{
  results: Result[]
}>()
const showAverage = computed(() => props.results[0].values.length > 1)
const bests = computed(() => [0, 1, 2].map(i => Math.min(...props.results.map(result => result.values[i]))))
const gridTemplate = computed(() => {
  if (showAverage.value)
    return `grid-cols-[3rem_max-content_4rem_2rem_2rem_2rem_minmax(2rem,1fr)]`
  return `grid-cols-[3rem_max-content_2rem_2rem_2rem_minmax(2rem,1fr)]`
})
</script>

<template>
  <div class="overflow-x-auto">
    <div class="grid gap-2 mt-2 whitespace-nowrap" :class="gridTemplate">
      <div class="grid grid-cols-subgrid col-span-full font-semibold text-sm">
        <div class="text-right">
          {{ $t('result.rank') }}
        </div>
        <div class="">
          {{ $t('result.name') }}
        </div>
        <div v-if="showAverage" class="text-right">
          {{ $t('result.mean') }}
        </div>
        <div :class="{ 'col-span-4': showAverage, 'col-span-5': !showAverage }">
          {{ $t('result.solves') }}
        </div>
      </div>
      <WeeklyResult v-for="result in results" :key="result.user.id" :result="result" :bests="bests" />
    </div>
  </div>
</template>
