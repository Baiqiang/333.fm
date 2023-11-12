<script setup lang="ts">
const props = defineProps<{
  results: Result[]
}>()
const bests = computed(() => [0, 1, 2].map(i => Math.min(...props.results.map(result => result.values[i]))))
</script>

<template>
  <div class="overflow-x-auto">
    <div class="grid grid-cols-[3rem_minmax(min-content,max-content)_3rem_3rem_3rem_minmax(3rem,1fr)] gap-2 md:gap-x-3 mt-2 whitespace-nowrap">
      <div class="col-start-1 font-semibold text-sm text-right">
        {{ $t('weekly.rank') }}
      </div>
      <div class="col-start-2 font-semibold text-sm">
        {{ $t('weekly.name') }}
      </div>
      <div class="col-start-3 font-semibold text-sm text-right">
        {{ $t('weekly.mean') }}
      </div>
      <div class="col-start-4 col-span-3 font-semibold text-sm">
        {{ $t('weekly.solves') }}
      </div>
      <WeeklyResult v-for="result in results" :key="result.user.id" :result="result" :bests="bests" />
      <div class="col-start-5" />
      <div class="col-start-6" />
    </div>
  </div>
</template>
