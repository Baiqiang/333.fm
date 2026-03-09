<script setup lang="ts">
defineProps<{
  scramble: string
}>()
</script>

<template>
  <Sequence :sequence="scramble" :source="scramble" class="sticky top-0 z-30 text-lg bg-gray-50 font-semibold border-l-2 border-indigo-300 px-2 shadow-md mb-2 " />
</template>
