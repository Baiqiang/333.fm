<script setup lang="ts">
defineProps<{
  sequence: string
  html?: boolean
}>()
</script>

<template>
  <pre v-if="!html" class="sequence">{{ sequence }}</pre>
  <pre v-else class="sequence" v-html="sequence" />
</template>

<style scoped>
.sequence {
  @apply whitespace-pre-wrap;

  overflow-wrap: anywhere;
}
</style>
