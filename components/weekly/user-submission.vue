<script setup lang="ts">
defineProps<{
  submission: Submission
}>()
</script>

<template>
  <div class="border-t border-gray-300 pt-2 mt-2 flex flex-col md:flex-row gap-2 items-start">
    <WeeklyUser :user="submission.user" />
    <WeeklySubmission :submission="submission" />
  </div>
</template>
