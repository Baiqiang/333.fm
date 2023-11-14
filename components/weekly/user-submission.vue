<script setup lang="ts">
defineProps<{
  submission: Submission
}>()
</script>

<template>
  <div class="border-t border-gray-300 pt-2 mt-2 flex flex-col md:flex-row gap-2 items-start">
    <WeeklyUser :user="submission.user">
      <div v-if="submission.moves !== DNF" class="font-bold" :class="{ 'text-indigo-500': submission.mode === CompetitionMode.REGULAR, 'text-orange-500': submission.mode === CompetitionMode.UNLIMITED }">
        {{ formatResult(submission.moves) }}
      </div>
      <div v-else class="text-red-500 font-bold">
        DNF
      </div>
    </WeeklyUser>
    <WeeklySubmission :submission="submission" />
  </div>
</template>
