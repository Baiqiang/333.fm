<script setup lang="ts">
defineProps<{
  submission: SubmissionData
  timerDisplay: string
}>()
</script>

<template>
  <div class="bg-white shadow-md p-6 mb-4">
    <h2 class="text-xl font-bold mb-2" :class="submission.correctCount === submission.totalQuestions ? 'text-green-600' : 'text-indigo-600'">
      {{ submission.correctCount === submission.totalQuestions ? $t('quiz.result.perfect') : $t('quiz.result.title') }}
    </h2>
    <div class="grid grid-cols-3 gap-4 text-center">
      <div>
        <div class="text-2xl font-bold text-indigo-600">
          {{ submission.correctCount }}/{{ submission.totalQuestions }}
        </div>
        <div class="text-sm text-gray-500">
          {{ $t('quiz.result.accuracy') }}
        </div>
      </div>
      <div>
        <div class="text-2xl font-bold text-indigo-600">
          {{ Math.round((submission.correctCount! / submission.totalQuestions) * 100) }}%
        </div>
        <div class="text-sm text-gray-500">
          {{ $t('quiz.result.accuracy') }}
        </div>
      </div>
      <div>
        <div class="text-2xl font-bold text-green-600">
          {{ timerDisplay }}
        </div>
        <div class="text-sm text-gray-500">
          {{ $t('quiz.result.timeLeft') }}
        </div>
      </div>
    </div>
  </div>
</template>
