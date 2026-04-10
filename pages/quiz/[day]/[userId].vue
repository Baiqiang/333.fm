<script setup lang="ts">
const { t } = useI18n()
const route = useRoute()
const day = route.params.day as string
const userId = Number(route.params.userId)

const { data } = await useApi<SubmissionPageResponse>(`/quiz/day/${day}/submission/${userId}`)

const quizData = computed(() => data.value?.quiz ?? null)
const questions = computed(() => data.value?.questions ?? [])
const targetUser = computed(() => data.value?.user ?? null)
const sub = computed(() => data.value?.submission ?? null)

useSeoMeta({
  title: `${t('quiz.title')} - ${day} - ${targetUser.value?.name ?? ''}`,
})

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

const leaderboard = ref<LeaderboardEntry[]>([])

async function loadLeaderboard() {
  if (!quizData.value)
    return
  try {
    const res = await useClientApi<LeaderboardEntry[]>(`/quiz/leaderboard/${quizData.value.id}`)
    leaderboard.value = res
  }
  catch {}
}

onMounted(() => {
  loadLeaderboard()
})
</script>

<template>
  <div class="container mx-auto px-4 py-6 max-w-3xl">
    <div class="flex items-center gap-2 mb-4">
      <NuxtLink :to="`/quiz/${day}`" class="text-indigo-500 hover:text-indigo-600 transition-colors">
        <Icon name="mdi:arrow-left" />
      </NuxtLink>
      <h1 class="text-2xl font-bold font-poppins">
        {{ $t('quiz.title') }} · {{ day }}
      </h1>
    </div>

    <div v-if="!data || !targetUser" class="text-gray-400">
      {{ $t('quiz.noQuiz') }}
    </div>

    <template v-else>
      <!-- Leaderboard -->
      <QuizLeaderboard
        v-if="leaderboard.length > 0"
        class="mb-6"
        :leaderboard="leaderboard"
        :format-time="formatTime"
        :quiz-day="day"
        :active-user-id="userId"
      />

      <!-- User info banner -->
      <div class="bg-indigo-50 border-l-4 border-indigo-500 p-4 mb-4 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <Icon name="mdi:eye" class="text-indigo-500" />
          <span class="text-sm font-semibold text-indigo-700">{{ $t('quiz.viewingUser', { name: targetUser.name }) }}</span>
          <span v-if="sub" class="text-xs text-indigo-500 ml-2">
            {{ sub.correctCount }}/{{ sub.totalQuestions }}
            · {{ formatTime(sub.remainingTime) }}
          </span>
        </div>
      </div>

      <!-- Questions -->
      <div class="space-y-6">
        <QuizQuestionCard
          v-for="(q, qi) in questions"
          :key="qi"
          :question="q"
          :index="qi"
          :user-answers="sub?.answers[qi] || []"
          :is-finished="true"
          :is-review-only="false"
          :cube-static="true"
        />
      </div>
    </template>
  </div>
</template>
