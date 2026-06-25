<script setup lang="ts">
const { t } = useI18n()
const user = useUser()

useSeoMeta({
  title: t('quiz.title'),
})

const {
  quiz,
  questions,
  submission,
  loading,
  error,
  timerDisplay,
  leaderboard,
  isPlaying,
  isFinished,
  isReviewOnly,
  answeredCount,
  answers,
  applyData,
  formatTime,
  start,
  toggleOption,
  submitQuiz,
  onAfterSubmit,
} = useQuizGame()

const { data: initialData } = await useApi<QuizResponse>('/quiz/today')
if (initialData.value) {
  applyData(initialData.value)
}

onAfterSubmit(() => {
  if (quiz.value) {
    navigateTo(`/quiz/${quiz.value.day}/${user.id}`)
  }
})
</script>

<template>
  <div class="container mx-auto px-4 py-6 max-w-3xl">
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
      <h1 class="text-2xl font-bold font-poppins">
        {{ $t('quiz.title') }}
      </h1>
      <NuxtLink to="/quiz/history" class="bg-indigo-500 text-white px-3 py-1.5 text-sm shadow-md hover:bg-indigo-600 hover:-translate-y-0.5 transition-all duration-200 flex items-center gap-1 self-start sm:self-auto">
        <Icon name="mdi:history" />
        {{ $t('quiz.history.title') }}
      </NuxtLink>
    </div>

    <p class="text-gray-600 mb-4">
      {{ $t('quiz.description', { count: quiz?.questionCount || 10 }) }}
    </p>
    <p class="text-xs text-gray-400 mb-4">
      {{ $t('quiz.multipleChoice') }}
    </p>

    <!-- Not started -->
    <div v-if="quiz && !submission?.started">
      <div class="bg-white shadow-md p-6 mb-4 text-center">
        <div class="text-lg font-bold text-indigo-600 mb-2">
          {{ quiz.day }}
        </div>
        <div class="text-gray-500 mb-4">
          {{ quiz.questionCount }} {{ $t('quiz.today') }}
        </div>
        <div v-if="user.signedIn">
          <button
            class="bg-indigo-500 text-white px-6 py-3 text-lg shadow-md hover:bg-indigo-600 hover:-translate-y-0.5 transition-all duration-200"
            :disabled="loading"
            @click="start"
          >
            <Spinner v-if="loading" class="w-5 h-5 text-white border-[3px] inline-block mr-2" />
            {{ $t('quiz.start') }}
          </button>
        </div>
        <div v-else>
          <NuxtLink to="/sign-in" class="bg-indigo-500 text-white px-4 py-2 shadow-md hover:bg-indigo-600 transition-all duration-200 inline-block">
            {{ $t('quiz.signInToPlay') }}
          </NuxtLink>
        </div>
      </div>
    </div>

    <!-- Playing / Finished -->
    <div v-if="(isPlaying || isFinished) && questions.length > 0">
      <!-- Sticky timer bar -->
      <div v-if="isPlaying" class="sticky top-0 z-10 bg-white shadow-md px-3 py-2 mb-4 flex items-center justify-between">
        <span class="text-gray-500 text-sm font-semibold">{{ $t('quiz.timeRemaining') }}</span>
        <div class="font-mono font-bold text-2xl" :class="timerDisplay.startsWith('0:') ? 'text-red-500' : 'text-indigo-600'">
          {{ timerDisplay }}
        </div>
      </div>

      <!-- Leaderboard (on top when finished) -->
      <QuizLeaderboard
        v-if="isFinished && leaderboard.length > 0 && quiz"
        class="mb-6"
        :leaderboard="leaderboard"
        :format-time="formatTime"
        :quiz-day="quiz.day"
      />

      <QuizResultSummary v-if="isFinished && submission" :submission="submission" :timer-display="timerDisplay" />

      <!-- Questions -->
      <div class="space-y-6">
        <QuizQuestionCard
          v-for="(q, qi) in questions"
          :key="qi"
          :question="q"
          :index="qi"
          :user-answers="answers[qi] || []"
          :is-finished="isFinished"
          :is-review-only="isReviewOnly"
          @toggle="toggleOption(qi, $event)"
        />
      </div>

      <!-- Submit button -->
      <div v-if="isPlaying" class="sticky bottom-0 bg-white shadow-md p-4 mt-4 flex items-center justify-between">
        <span class="text-sm text-gray-400">
          {{ answeredCount }}/{{ questions.length }}
        </span>
        <button
          class="bg-indigo-500 text-white px-6 py-3 text-lg shadow-md hover:bg-indigo-600 hover:-translate-y-0.5 transition-all duration-200"
          :disabled="loading"
          @click="submitQuiz"
        >
          <Spinner v-if="loading" class="w-5 h-5 text-white border-[3px] inline-block mr-2" />
          {{ $t('quiz.submit') }}
        </button>
      </div>
    </div>

    <!-- Error -->
    <div v-if="error" class="text-red-500 mb-4">
      {{ error }}
    </div>
  </div>
</template>
