<script setup lang="ts">
defineProps<{
  competition: Competition
}>()
</script>

<template>
  <div>
    <WeeklyStatus :competition="competition" />
    <div v-for="{ scramble, number } in competition.scrambles" :key="number" class="mt-2">
      <Sequence :sequence="scramble" :source="scramble" :prefix="`No.${number} `" />
      <CubeExpanded :moves="scramble" />
    </div>
    <div class="mt-4">
      <NuxtLink :to="`/weekly/${competition.alias}`" class="bg-indigo-500 text-white px-3 py-2 text-lg">
        {{ $t('weekly.join') }}
      </NuxtLink>
    </div>
  </div>
</template>
