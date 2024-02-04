<script setup lang="ts">
defineProps<{
  submission: Submission
}>()
</script>

<template>
  <div v-if="submission.moves !== DNF" class="font-bold" :class="{ 'text-indigo-500': submission.mode === CompetitionMode.REGULAR, 'text-orange-500': submission.mode === CompetitionMode.UNLIMITED }">
    {{ formatResult(submission.moves) }}
  </div>
  <div v-else class="text-gray-500 font-bold">
    DNF
  </div>
</template>
