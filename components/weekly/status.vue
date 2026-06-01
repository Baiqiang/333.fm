<script setup lang="ts">
const props = defineProps<{
  competition: Competition
}>()
const { format } = useDateTime()
const isOnGoing = computed(() => isInStatus(props.competition, CompetitionStatus.ON_GOING))
const hasEnded = computed(() => isInStatus(props.competition, CompetitionStatus.ENDED))
const startTime = computed(() => format(props.competition.startTime))
const endTime = computed(() => format(props.competition.endTime))
</script>

<template>
  <div>
    <p v-if="isOnGoing && competition.endTime">
      {{ $t('weekly.period.onGoing', { start: startTime, end: endTime }) }}
    </p>
    <p v-else-if="isOnGoing">
      {{ $t('weekly.period.started', { start: startTime }) }}
    </p>
    <p v-else-if="hasEnded">
      {{ $t('weekly.period.ended', { end: endTime }) }}
    </p>
    <p v-else>
      {{ $t('weekly.period.pendingStart', { start: startTime }) }}
    </p>
    <div v-if="isOnGoing && competition.endTime" class="mt-2 mb-3">
      <div class="text-xs uppercase tracking-wide text-gray-400 mb-1">
        {{ $t('weekly.period.endsIn') }}
      </div>
      <Countdown :to="competition.endTime" :from="competition.startTime" />
    </div>
    <div v-else-if="!isOnGoing && !hasEnded" class="mt-2 mb-3">
      <div class="text-xs uppercase tracking-wide text-gray-400 mb-1">
        {{ $t('weekly.period.startsIn') }}
      </div>
      <Countdown :to="competition.startTime" />
    </div>
  </div>
</template>
