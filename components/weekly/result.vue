<script setup lang="ts">
const props = defineProps<{
  result: Result
  bests: number[]
}>()
const finished = computed(() => !props.result.values.includes(0))
const showAverage = computed(() => props.result.values.length > 1)
</script>

<template>
  <div class="grid grid-cols-subgrid col-span-full">
    <div class="text-right font-mono" :class="{ 'opacity-50': !finished }">
      <Icon v-if="result.rank === 1" name="openmoji:1st-place-medal" size="24" />
      <Icon v-if="result.rank === 2" name="openmoji:2nd-place-medal" size="24" />
      <Icon v-if="result.rank === 3" name="openmoji:3rd-place-medal" size="24" />
      {{ result.rank }}
    </div>
    <UserAvatarName :user="result.user" />
    <div v-if="showAverage" class="text-right font-mono font-bold" :class="{ 'opacity-50': !finished }">
      {{ formatResult(result.average, 2) }}
    </div>
    <div
      v-for="value, index in result.values"
      :key="index"
      class="font-mono"
      :class="{
        'text-indigo-500 font-bold': value === bests[index],
        'text-red-400': value === DNF,
        'text-orange-400': value === DNS,
      }"
    >
      {{ formatResult(value) }}
    </div>
  </div>
</template>
