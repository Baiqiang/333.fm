<script setup lang="ts">
defineProps<{
  competition: Competition
}>()
</script>

<template>
  <div>
    <WeeklyStatus :competition="competition" />
    <div class="mt-1">
      <NuxtLink :to="competitionPath(competition)" class="bg-indigo-500 text-white px-3 py-2 text-xs">
        {{ $t('weekly.join') }} <Icon name="ic:round-keyboard-double-arrow-right" />
      </NuxtLink>
    </div>
    <div v-for="{ scramble, number } in competition.scrambles" :key="number" class="mt-2">
      <Sequence :sequence="scramble" :source="scramble" :prefix="`No.${number} `" />
      <CubeExpanded :moves="scramble" />
    </div>
  </div>
</template>
