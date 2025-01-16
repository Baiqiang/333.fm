<script setup lang="ts">
defineProps<{
  sequence: string
  html?: boolean
  prefix?: string
  source?: string
}>()
</script>

<template>
  <div class="flex items-start gap-1">
    <pre v-if="!html" class="sequence"><span v-if="prefix" class="select-none">{{ prefix }}</span>{{ sequence }}</pre>
    <pre v-else class="sequence" v-html="sequence" />
    <CopyButton v-if="source" :source="source" class="pt-1 flex items-center" />
  </div>
</template>

<style scoped>
.sequence {
  @apply whitespace-pre-wrap;

  overflow-wrap: anywhere;
}
</style>
