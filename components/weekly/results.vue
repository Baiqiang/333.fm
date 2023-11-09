<script setup lang="ts">
defineProps<{
  results: Result[]
}>()
</script>

<template>
  <div class="grid gap-1 md:gap-2 mt-2">
    <WeeklyResult v-for="result in results" :key="result.user.id" :result="result" />
  </div>
</template>
