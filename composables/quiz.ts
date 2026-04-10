export function useQuizGame() {
  const { t } = useI18n()

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
  let afterSubmitHook: (() => void) | null = null

  function onAfterSubmit(hook: () => void) {
    afterSubmitHook = hook
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
    else {
      answers.value = Array.from({ length: data.quiz?.questionCount || 10 }, () => [])
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
  const answeredCount = computed(() =>
    answers.value.filter(a => a.length > 0).length,
  )

  function startTimer() {
    if (!import.meta.client)
      return
    stopTimer()
    function tick() {
      if (!isPlaying.value)
        return
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
    if (!quiz.value)
      return
    loading.value = true
    error.value = ''
    try {
      const data = await useClientApi<QuizResponse>('/quiz/start', {
        method: 'POST',
        body: { quizId: quiz.value.id },
      })
      applyData(data)
    }
    catch (e: any) {
      error.value = e?.data?.message || e.message
    }
    finally {
      loading.value = false
    }
  }

  function toggleOption(qIndex: number, oIndex: number) {
    if (isFinished.value || isReviewOnly.value)
      return
    const current = answers.value[qIndex] || []
    const pos = current.indexOf(oIndex)
    if (pos >= 0) {
      current.splice(pos, 1)
    }
    else {
      current.push(oIndex)
    }
    answers.value[qIndex] = [...current]
  }

  async function submitQuiz() {
    if (!quiz.value || !confirm(t('quiz.submitConfirm')))
      return
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
      afterSubmitHook?.()
    }
    catch (e: any) {
      error.value = e?.data?.message || e.message
    }
    finally {
      loading.value = false
    }
  }

  async function handleTimeUp() {
    stopTimer()
    timerDisplay.value = '0:00'
    if (!quiz.value)
      return
    loading.value = true
    try {
      const data = await useClientApi<QuizResponse>('/quiz/submit', {
        method: 'POST',
        body: { quizId: quiz.value.id, answers: answers.value },
      })
      applyData(data)
      loadLeaderboard()
      afterSubmitHook?.()
    }
    catch {}
    loading.value = false
  }

  async function loadLeaderboard() {
    if (!quiz.value)
      return
    try {
      const data = await useClientApi<LeaderboardEntry[]>(`/quiz/leaderboard/${quiz.value.id}`)
      leaderboard.value = data
    }
    catch {}
  }

  onMounted(() => {
    if (isFinished.value || isReviewOnly.value) {
      loadLeaderboard()
    }
  })

  onUnmounted(() => {
    stopTimer()
  })

  return {
    quiz,
    questions,
    submission,
    answers,
    loading,
    error,
    timerDisplay,
    leaderboard,
    isToday,
    isPlaying,
    isFinished,
    isReviewOnly,
    answeredCount,
    applyData,
    formatTime,
    start,
    toggleOption,
    submitQuiz,
    loadLeaderboard,
    onAfterSubmit,
  }
}
