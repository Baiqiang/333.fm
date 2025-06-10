<script setup lang="ts">
const props = defineProps<{
  competition: Competition
}>()
const { locale } = useI18n()
const dayjs = useDayjs()
const isOnGoing = computed(() => isInStatus(props.competition, CompetitionStatus.ON_GOING))
const hasEnded = computed(() => isInStatus(props.competition, CompetitionStatus.ENDED))
const startTime = computed(() => dayjs(props.competition.startTime).locale(locale.value).format('LLL'))
const endTime = computed(() => dayjs(props.competition.endTime).locale(locale.value).format('LLL'))
</script>

<template>
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
</template>
