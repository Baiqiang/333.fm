<script setup lang="ts">
withDefaults(defineProps<{
  competition: Competition
  showCube?: boolean
}>(), {
  showCube: true,
})
</script>

<template>
  <div>
    <WeeklyStatus :competition="competition" />
    <div class="mt-1">
      <ButtonPrimary :to="competitionPath(competition)" icon="ic:round-keyboard-double-arrow-right">
        {{ $t('weekly.join') }}
      </ButtonPrimary>
    </div>
    <div v-for="{ scramble, number } in competition.scrambles" :key="number" class="mt-2">
      <Sequence :sequence="scramble" :source="scramble" :prefix="`No.${number} `" />
      <CubeExpanded v-if="showCube" :moves="scramble" />
    </div>
  </div>
</template>
