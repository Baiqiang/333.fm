<script setup lang="ts">
const props = defineProps<{
  result: Result
}>()
const { competition, submissions } = toRefs(props.result)
</script>

<template>
  <div class="grid grid-cols-subgrid col-span-full border-b border-gray-300 pb-2">
    <slot name="competition">
      <CompetitionName :competition="competition" class="pl-2" />
    </slot>
    <div class="text-right font-mono">
      <Icon v-if="result.rank === 1" name="openmoji:1st-place-medal" size="24" />
      <Icon v-if="result.rank === 2" name="openmoji:2nd-place-medal" size="24" />
      <Icon v-if="result.rank === 3" name="openmoji:3rd-place-medal" size="24" />
      {{ result.rank }}
    </div>
    <div class="text-right font-mono font-bold">
      {{ formatResult(result.average, 2) }}
    </div>
    <div class="text-right font-mono">
      {{ formatResult(result.best) }}
    </div>
    <div
      v-for="value, index in result.values"
      :key="index"
      class="font-mono"
      :class="{
        'text-red-400': value === DNF,
        'text-orange-400': value === DNS,
      }"
    >
      {{ formatResult(value) }}
    </div>
  </div>
</template>
