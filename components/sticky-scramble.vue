<script setup lang="ts">
defineProps<{
  scramble: string
}>()
</script>

<template>
  <Sequence :sequence="scramble" :source="scramble" class="sticky top-0 z-50 bg-gray-50" />
</template>
