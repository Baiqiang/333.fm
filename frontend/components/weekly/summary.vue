<script setup lang="ts">
withDefaults(defineProps<{
  competition: Competition
  showCube?: boolean
}>(), {
  showCube: true,
})
const preferCube = usePreference('scrambleCube', false)
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
      <CubeExpanded v-if="showCube && preferCube" :moves="scramble" />
    </div>
    <button
      v-if="showCube && !preferCube && competition.scrambles.length"
      class="mt-2 flex items-center gap-1 text-sm text-blue-500 hover:text-blue-600"
      @click="preferCube = true"
    >
      <Icon name="mdi:cube-unfolded" />
      {{ $t('home.showCube') }}
    </button>
  </div>
</template>
