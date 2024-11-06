<script setup lang="ts">
defineProps<{
  result: WCAResult
}>()
</script>

<template>
  <div class="grid grid-cols-subgrid col-span-full border-b border-gray-300 pb-2">
    <slot name="competition">
      <a
        :href="`https://www.worldcubeassociation.org/competitions/${result.competition_id}`"
        class="pl-2 text-blue-500"
        target="_blank"
      >
        {{ result.competition_id }}
      </a>
    </slot>
    <div class="text-right font-mono">
      {{ $t(`result.roundType.${result.round_type_id}`) }}
    </div>
    <div class="text-right font-mono">
      <Icon v-if="result.pos === 1" name="openmoji:1st-place-medal" size="24" />
      <Icon v-if="result.pos === 2" name="openmoji:2nd-place-medal" size="24" />
      <Icon v-if="result.pos === 3" name="openmoji:3rd-place-medal" size="24" />
      {{ result.pos }}
    </div>
    <div class="text-right font-mono font-bold">
      {{ formatWCAResult(result.average, 2, 100) }}
    </div>
    <div class="text-right font-mono">
      {{ formatWCAResult(result.best) }}
    </div>
    <div
      v-for="value, index in result.attempts.filter(r => r !== 0)"
      :key="index"
      class="font-mono"
      :class="{
        'text-red-400': value === WCA_DNF,
        'text-orange-400': value === WCA_DNS,
      }"
    >
      {{ formatWCAResult(value) }}
    </div>
  </div>
</template>
