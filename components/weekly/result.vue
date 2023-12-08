<script setup lang="ts">
defineProps<{
  result: Result
  bests: number[]
}>()
</script>

<template>
  <div class="col-start-1 text-right font-mono">
    <Icon v-if="result.rank === 1" name="openmoji:1st-place-medal" size="24" />
    <Icon v-if="result.rank === 2" name="openmoji:2nd-place-medal" size="24" />
    <Icon v-if="result.rank === 3" name="openmoji:3rd-place-medal" size="24" />
    {{ result.rank }}
  </div>
  <UserAvatarName :user="result.user" class="col-start-2" />
  <div class="col-start-3 text-right font-mono font-bold">
    {{ formatResult(result.average, 2) }}
  </div>
  <div
    v-for="value, index in result.values"
    :key="index"
    class="font-mono"
    :class="[`col-start-${index + 5}`, {
      'text-indigo-500 font-bold': value === bests[index],
      'text-red-400': value === DNF,
      'text-orange-400': value === DNS,
    }]"
  >
    {{ formatResult(value) }}
  </div>
</template>
