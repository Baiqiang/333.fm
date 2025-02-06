<script setup lang="ts">
defineProps<{
  competition: Competition
}>()
</script>

<template>
  <div>
    <div class="float-right">
      <NuxtLink :to="competitionPath(competition)" class="bg-indigo-500 text-white px-3 py-2 text-sm">
        {{ $t('weekly.join') }}
      </NuxtLink>
    </div>
    <WeeklyStatus :competition="competition" />
    <div v-for="{ scramble, number } in competition.scrambles" :key="number" class="mt-2">
      <Sequence :sequence="scramble" :source="scramble" :prefix="`No.${number} `" />
      <CubeExpanded :moves="scramble" />
    </div>
  </div>
</template>
