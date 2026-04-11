<script setup lang="ts">
const { t } = useI18n()
const route = useRoute()
const user = useUser()
const day = route.params.day as string

useSeoMeta({
  title: `${t('quiz.title')} - ${day}`,
})

const {
  quiz,
  questions,
  submission,
  loading,
  error,
  timerDisplay,
  leaderboard,
  isToday,
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

const { data: initialData } = await useApi<QuizResponse>(`/quiz/day/${day}`)
if (initialData.value) {
  applyData(initialData.value)
}

onAfterSubmit(() => {
  if (quiz.value) {
    navigateTo(`/quiz/${day}/${user.id}`)
  }
})
</script>

<template>
  <div class="container mx-auto px-4 py-6 max-w-3xl">
    <div class="flex items-center gap-2 mb-4">
      <NuxtLink to="/quiz" class="text-indigo-500 hover:text-indigo-600 transition-colors">
        <Icon name="mdi:arrow-left" />
      </NuxtLink>
      <h1 class="text-2xl font-bold font-poppins">
        {{ $t('quiz.title') }} · {{ day }}
      </h1>
    </div>

    <!-- Quiz not found -->
    <div v-if="!quiz" class="text-gray-400">
      {{ $t('quiz.noQuiz') }}
    </div>

    <!-- Not started -->
    <div v-else-if="!submission?.started && isToday">
      <div class="bg-white shadow-md p-6 mb-4 text-center">
        <div class="text-lg font-bold text-indigo-600 mb-2">
          {{ quiz.day }}
        </div>
        <div class="text-gray-500 mb-4">
          {{ quiz.questionCount }} Q
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

    <!-- Review-only banner for expired quizzes -->
    <div v-else-if="isReviewOnly" class="bg-gray-100 border-l-4 border-gray-400 p-4 mb-4 text-gray-600">
      <Icon name="mdi:lock-outline" class="mr-1" />
      {{ $t('quiz.expired') }}
    </div>

    <!-- Playing / Finished -->
    <div v-if="(isPlaying || isFinished || isReviewOnly) && questions.length > 0">
      <!-- Timer -->
      <div v-if="isPlaying" class="sticky top-0 z-10 bg-white shadow-md px-3 py-2 mb-4 flex items-center justify-between">
        <span class="text-gray-500 text-sm font-semibold">{{ $t('quiz.timeRemaining') }}</span>
        <div class="font-mono font-bold text-2xl" :class="timerDisplay.startsWith('0:') ? 'text-red-500' : 'text-indigo-600'">
          {{ timerDisplay }}
        </div>
      </div>

      <!-- Leaderboard (on top when finished) -->
      <QuizLeaderboard
        v-if="(isFinished || isReviewOnly) && leaderboard.length > 0"
        class="mb-6"
        :leaderboard="leaderboard"
        :format-time="formatTime"
        :quiz-day="day"
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

      <!-- Submit -->
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
