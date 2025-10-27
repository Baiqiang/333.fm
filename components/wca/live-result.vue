<script setup lang="ts">
defineProps<{
  result: WCALiveRoundResult
  format: 'm' | 'o'
}>()
</script>

<template>
  <div class="grid grid-cols-subgrid col-span-full border-b border-gray-300 py-2 odd:bg-gray-200">
    <div class="text-right font-mono px-2">
      <Icon v-if="result.ranking === 1" name="openmoji:1st-place-medal" size="24" />
      <Icon v-if="result.ranking === 2" name="openmoji:2nd-place-medal" size="24" />
      <Icon v-if="result.ranking === 3" name="openmoji:3rd-place-medal" size="24" />
      {{ result.ranking }}
    </div>
    <div>
      {{ result.person.name }}
    </div>
    <div v-if="format === 'm'" class="text-right font-mono font-bold">
      {{ formatWCAResult(result.average, 2, 100) }}
    </div>
    <div class="text-right font-mono">
      {{ formatWCAResult(result.best) }}
    </div>
    <div
      class="flex gap-1 font-mono"
      :class="{
        'col-span-2': format !== 'm',
      }"
    >
      <div
        v-for="{ result: value }, index in result.attempts"
        :key="index"
        class="w-8"
        :class="{
          'text-red-400': value === WCA_DNF,
          'text-orange-400': value === WCA_DNS,
        }"
      >
        {{ formatWCAResult(value) }}
      </div>
    </div>
  </div>
</template>
