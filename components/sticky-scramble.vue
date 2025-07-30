<script setup lang="ts">
defineProps<{
  scramble: string
}>()
</script>

<template>
  <Sequence :sequence="scramble" :source="scramble" class="sticky top-0 backdrop-blur-3xl" />
</template>
