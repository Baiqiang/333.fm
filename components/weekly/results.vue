<script setup lang="ts">
const props = defineProps<{
  results: Result[]
}>()
const bests = computed(() => [0, 1, 2].map(i => Math.min(...props.results.map(result => result.values[i]))))
</script>

<template>
  <div class="overflow-x-auto">
    <div class="grid gap-2 mt-2 whitespace-nowrap auto-cols-max md:auto-cols-fr">
      <div class="col-start-1 font-semibold text-sm text-right">
        {{ $t('weekly.rank') }}
      </div>
      <div class="col-start-2 font-semibold text-sm">
        {{ $t('weekly.name') }}
      </div>
      <div class="col-start-3 font-semibold text-sm text-right">
        {{ $t('weekly.mean') }}
      </div>
      <div class="col-start-4 font-semibold text-sm">
        {{ $t('weekly.solves') }}
      </div>
      <WeeklyResult v-for="result in results" :key="result.user.id" :result="result" :bests="bests" />
    </div>
  </div>
</template>
