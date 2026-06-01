<script setup lang="ts">
const props = withDefaults(defineProps<{
  value: string | number | Date | null | undefined
  intent?: DateIntent
}>(), {
  intent: 'datetime',
})
const { format, iso } = useDateTime()
const text = computed(() => format(props.value, props.intent))
const datetime = computed(() => iso(props.value))
</script>

<template>
  <time :datetime="datetime">{{ text }}</time>
</template>
