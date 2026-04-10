<script setup lang="ts">
const { t } = useI18n()
const route = useRoute()
const user = useUser()
const day = route.params.day as string

useSeoMeta({
  title: `${t('quiz.title')} - ${day}`,
})

const quiz = ref<QuizInfo | null>(null)
const questions = ref<QuizQuestionData[]>([])
const submission = ref<SubmissionData | null>(null)
const answers = ref<number[][]>([])
const loading = ref(false)
const error = ref('')
const timerDisplay = ref('30:00')
const leaderboard = ref<LeaderboardEntry[]>([])

let timerRaf: number | null = null
let startedAt = 0
let serverRemainingAtSync = 0

const { data: initialData } = await useApi<QuizResponse>(`/quiz/day/${day}`)
if (initialData.value) {
  applyData(initialData.value)
}

function applyData(data: QuizResponse) {
  quiz.value = data.quiz
  if (data.questions) {
    questions.value = data.questions
  }
  submission.value = data.submission
  if (data.submission) {
    answers.value = data.submission.answers?.length
      ? [...data.submission.answers]
      : Array.from({ length: data.quiz?.questionCount || 10 }, () => [])
    if (data.submission.started && !data.submission.finished && data.submission.startedAt) {
      serverRemainingAtSync = data.submission.remainingTime
      startedAt = Date.now()
      startTimer()
    }
    if (data.submission.finished) {
      timerDisplay.value = formatTime(data.submission.remainingTime)
    }
  }
}

const isToday = computed(() => quiz.value?.isToday ?? false)
const isPlaying = computed(() =>
  submission.value?.started && !submission.value?.finished,
)
const isFinished = computed(() =>
  submission.value?.finished ?? false,
)
const isReviewOnly = computed(() =>
  !isToday.value && !isFinished.value,
)

function startTimer() {
  stopTimer()
  function tick() {
    if (!isPlaying.value) return
    const elapsed = Date.now() - startedAt
    const remaining = Math.max(0, serverRemainingAtSync - elapsed)
    timerDisplay.value = formatTime(remaining)
    if (remaining <= 0) {
      handleTimeUp()
      return
    }
    timerRaf = requestAnimationFrame(tick)
  }
  timerRaf = requestAnimationFrame(tick)
}

function stopTimer() {
  if (timerRaf != null) {
    cancelAnimationFrame(timerRaf)
    timerRaf = null
  }
}

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

async function start() {
  if (!quiz.value) return
  loading.value = true
  error.value = ''
  try {
    const data = await useClientApi<QuizResponse>('/quiz/start', {
      method: 'POST',
      body: { quizId: quiz.value.id },
    })
    applyData(data)
  } catch (e: any) {
    error.value = e?.data?.message || e.message
  } finally {
    loading.value = false
  }
}

function toggleOption(qIndex: number, oIndex: number) {
  if (isFinished.value || isReviewOnly.value) return
  const current = answers.value[qIndex] || []
  const pos = current.indexOf(oIndex)
  if (pos >= 0) {
    current.splice(pos, 1)
  } else {
    current.push(oIndex)
  }
  answers.value[qIndex] = [...current]
}

async function submitQuiz() {
  if (!quiz.value || !confirm(t('quiz.submitConfirm'))) return
  loading.value = true
  error.value = ''
  try {
    const data = await useClientApi<QuizResponse>('/quiz/submit', {
      method: 'POST',
      body: { quizId: quiz.value.id, answers: answers.value },
    })
    applyData(data)
    stopTimer()
    loadLeaderboard()
  } catch (e: any) {
    error.value = e?.data?.message || e.message
  } finally {
    loading.value = false
  }
}

async function handleTimeUp() {
  stopTimer()
  timerDisplay.value = '0:00'
  if (!quiz.value) return
  loading.value = true
  try {
    const data = await useClientApi<QuizResponse>('/quiz/submit', {
      method: 'POST',
      body: { quizId: quiz.value.id, answers: answers.value },
    })
    applyData(data)
    loadLeaderboard()
  } catch {}
  loading.value = false
}

async function loadLeaderboard() {
  if (!quiz.value) return
  try {
    const data = await useClientApi<LeaderboardEntry[]>(`/quiz/leaderboard/${quiz.value.id}`)
    leaderboard.value = data
  } catch {}
}


function isQuestionCorrect(qi: number): boolean {
  if (!isFinished.value) return false
  const q = questions.value[qi]
  if (!q) return false
  const userAnswer = (answers.value[qi] || []).sort()
  const correctAnswer = q.options
    .map((o, idx) => (o.correct ? idx : -1))
    .filter(idx => idx >= 0)
    .sort()
  return (
    userAnswer.length === correctAnswer.length &&
    userAnswer.every((v, j) => v === correctAnswer[j])
  )
}

const answeredCount = computed(() =>
  answers.value.filter(a => a.length > 0).length,
)

function getOptionClass(qIndex: number, oIndex: number) {
  const selected = (answers.value[qIndex] || []).includes(oIndex)
  const showAnswers = isFinished.value || isReviewOnly.value
  if (!showAnswers) {
    return selected
      ? 'border-indigo-500 bg-indigo-50 shadow-md'
      : 'border-gray-300 hover:border-indigo-300 hover:bg-gray-50'
  }
  const option = questions.value[qIndex]?.options[oIndex]
  if (!option) return 'border-gray-300'
  const isCorrect = option.correct
  if (isReviewOnly.value && !isFinished.value) {
    return isCorrect ? 'border-green-500 bg-green-50' : 'border-gray-200 opacity-50'
  }
  if (isCorrect && selected) return 'border-green-500 bg-green-50'
  if (isCorrect && !selected) return 'border-green-500 bg-green-50/50 border-dashed'
  if (!isCorrect && selected) return 'border-red-500 bg-red-50'
  return 'border-gray-200 opacity-50'
}

onMounted(() => {
  if (isFinished.value || isReviewOnly.value) {
    loadLeaderboard()
  }
})

onUnmounted(() => {
  stopTimer()
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

      <!-- Result summary -->
      <div v-if="isFinished && submission" class="bg-white shadow-md p-6 mb-4">
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

      <!-- Questions -->
      <div class="space-y-6">
        <div
          v-for="(q, qi) in questions"
          :key="qi"
          class="bg-white shadow-md p-4"
        >
          <div class="flex items-start justify-between mb-2">
            <div>
              <span class="font-bold text-indigo-600 mr-2">{{ $t('quiz.question', { index: qi + 1 }) }}</span>
              <span v-if="q.negative" class="text-sm text-gray-600">
                {{ $tm(`quiz.questionTypeNegative.${q.type}`)[0] }}<span :class="isFinished ? 'text-red-500 font-bold underline decoration-2' : ''">{{ $tm(`quiz.questionTypeNegative.${q.type}`)[1] }}</span>{{ $tm(`quiz.questionTypeNegative.${q.type}`)[2] }}
              </span>
              <span v-else class="text-sm text-gray-600">
                {{ $t(`quiz.questionType.${q.type}`) }}
              </span>
            </div>
            <div v-if="isFinished && !isReviewOnly" class="shrink-0 ml-2">
              <Icon
                v-if="isQuestionCorrect(qi)"
                name="mdi:check-circle"
                class="text-green-500 text-xl"
              />
              <Icon v-else name="mdi:close-circle" class="text-red-500 text-xl" />
            </div>
          </div>

          <div class="mb-3">
            <div class="font-mono text-xs bg-gray-50 p-2 break-all mb-1">
              {{ q.scramble }}
            </div>
            <Cube3d :moves="q.scramble" :is-static="true" />
            <div class="text-xs text-gray-400 font-mono mt-1 flex gap-3">
              <span v-if="q.drAxis">{{ $t('quiz.drAxis', { axis: q.drAxis }) }}</span>
              <span v-if="q.lastMove">{{ $t('quiz.lastMove', { move: q.lastMove }) }}</span>
            </div>
          </div>

          <div class="grid grid-cols-1 gap-2">
            <button
              v-for="(o, oi) in q.options"
              :key="oi"
              class="text-left border-2 p-3 transition-all duration-200 flex items-start gap-2"
              :class="getOptionClass(qi, oi)"
              :disabled="isFinished || isReviewOnly"
              @click="toggleOption(qi, oi)"
            >
              <span class="font-bold text-sm shrink-0 w-6 h-6 flex items-center justify-center border" :class="(isReviewOnly && !isFinished) ? (o.correct ? 'bg-green-500 text-white border-green-500' : 'border-gray-300 text-gray-400') : (answers[qi] || []).includes(oi) ? 'bg-indigo-500 text-white border-indigo-500' : 'border-gray-300 text-gray-400'">
                {{ o.label }}
              </span>
              <span class="font-mono text-sm">{{ o.solution }}</span>
              <span v-if="(isFinished || isReviewOnly) && o.correct" class="ml-auto text-green-600 text-xs font-semibold shrink-0">✓</span>
              <span v-if="isFinished && !isReviewOnly && !o.correct && (answers[qi] || []).includes(oi)" class="ml-auto text-red-500 text-xs font-semibold shrink-0">✗</span>
            </button>
          </div>
        </div>
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

    <!-- Leaderboard -->
    <div v-if="(isFinished || isReviewOnly) && leaderboard.length > 0" class="mt-8">
      <h2 class="text-xl font-bold font-poppins mb-4">
        {{ $t('quiz.leaderboard.title') }}
      </h2>
      <div class="bg-white shadow-md p-4">
        <div class="grid grid-cols-[auto_1fr_auto_auto] gap-x-3 gap-y-2 text-sm items-center">
          <template v-for="entry in leaderboard" :key="entry.rank">
            <span class="text-gray-400 text-right">{{ entry.rank }}</span>
            <UserAvatarName :user="entry.user" />
            <span class="font-mono font-bold text-indigo-600 text-right">{{ entry.correctCount }}/{{ entry.totalQuestions }}</span>
            <span class="text-xs text-green-600 text-right">
              {{ entry.remainingTime > 0 ? formatTime(entry.remainingTime) : '' }}
            </span>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>
