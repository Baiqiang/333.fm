<script setup lang="ts">
const props = defineProps<{
  competition: Competition
  icon: string
  title?: string
  wide?: boolean
  hideCube?: boolean
}>()
const name = computed(() => props.title ?? competitionName(props.competition))
</script>

<template>
  <HomeCard :title="name" :icon="icon" :to="competitionPath(competition)">
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div v-if="competition.endTime">
        <div class="text-xs text-gray-400 mb-1">
          {{ $t('weekly.period.endsIn') }}
        </div>
        <Countdown :to="competition.endTime" :from="competition.startTime" size="sm" />
      </div>
      <ButtonPrimary :to="competitionPath(competition)" icon="ic:round-keyboard-double-arrow-right">
        {{ $t('weekly.join') }}
      </ButtonPrimary>
    </div>
    <template v-if="competition.scrambles?.length">
      <div :class="{ 'sm:grid sm:grid-cols-3 sm:gap-x-4': wide }">
        <div v-for="{ scramble, number } in competition.scrambles" :key="number" class="mt-3">
          <Sequence :sequence="scramble" :source="scramble" :prefix="`No.${number} `" />
          <ScrambleCube v-if="!hideCube" :moves="scramble" class="mt-1" />
        </div>
      </div>
    </template>
  </HomeCard>
</template>
