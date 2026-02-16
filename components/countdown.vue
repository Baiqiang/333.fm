<script setup lang="ts">
import { useCountdown } from '@vueuse/core'

const props = withDefaults(defineProps<{
  to: number | string | Date
  format?: string // e.g. "HH:mm:ss"
}>(), {
  format: 'HH:mm:ss',
})

const { seconds, minutes, hours, days, isEnded } = useCountdown(() => new Date(props.to))

function formatCountdown() {
  if (props.format === 'HH:mm:ss') {
    const pad = (n: number) => String(n).padStart(2, '0')
    const h = pad(hours.value + days.value * 24)
    const m = pad(minutes.value)
    const s = pad(seconds.value)
    return `${h}:${m}:${s}`
  }
  // Custom formatting logic can go here
  // Add more formats if needed
  return `${days.value}d ${hours.value}h ${minutes.value}m ${seconds.value}s`
}
</script>

<template>
  <span v-if="!isEnded">
    {{ formatCountdown() }}
  </span>
  <span v-else>
    Time's up!
  </span>
</template>
