<script setup lang="ts">
const props = defineProps<{
  question: QuizQuestionData
  index: number
  userAnswers: number[]
  isFinished: boolean
  isReviewOnly: boolean

}>()

const emit = defineEmits<{
  toggle: [optionIndex: number]
}>()

const showAnswers = computed(() => props.isFinished || props.isReviewOnly)

const isCorrect = computed(() => {
  if (!props.isFinished)
    return false
  const userAnswer = [...(props.userAnswers || [])].sort()
  const correctAnswer = props.question.options
    .map((o, idx) => (o.correct ? idx : -1))
    .filter(idx => idx >= 0)
    .sort()
  return (
    userAnswer.length === correctAnswer.length
    && userAnswer.every((v, j) => v === correctAnswer[j])
  )
})

function getOptionClass(oi: number) {
  const selected = (props.userAnswers || []).includes(oi)
  if (!showAnswers.value) {
    return selected
      ? 'border-indigo-500 bg-indigo-50 shadow-md'
      : 'border-gray-300 hover:border-indigo-300 hover:bg-gray-50'
  }
  const option = props.question.options[oi]
  if (!option)
    return 'border-gray-300'
  if (props.isReviewOnly && !props.isFinished) {
    return option.correct ? 'border-green-500 bg-green-50' : 'border-gray-200 opacity-50'
  }
  if (option.correct && selected)
    return 'border-green-500 bg-green-50'
  if (option.correct && !selected)
    return 'border-green-500 bg-green-50/50 border-dashed'
  if (!option.correct && selected)
    return 'border-red-500 bg-red-50'
  return 'border-gray-200 opacity-50'
}

function getLabelClass(oi: number, option: QuizOptionData) {
  if (props.isReviewOnly && !props.isFinished) {
    return option.correct
      ? 'bg-green-500 text-white border-green-500'
      : 'border-gray-300 text-gray-400'
  }
  return (props.userAnswers || []).includes(oi)
    ? 'bg-indigo-500 text-white border-indigo-500'
    : 'border-gray-300 text-gray-400'
}
</script>

<template>
  <div class="bg-white shadow-md p-4">
    <div class="flex items-start justify-between mb-2">
      <div>
        <span class="font-bold text-indigo-600 mr-2">{{ $t('quiz.question', { index: index + 1 }) }}</span>
        <span v-if="question.negative" class="text-sm text-gray-600">
          {{ $tm(`quiz.questionTypeNegative.${question.type}`)[0] }}<span :class="isFinished ? 'text-red-500 font-bold underline decoration-2' : ''">{{ $tm(`quiz.questionTypeNegative.${question.type}`)[1] }}</span>{{ $tm(`quiz.questionTypeNegative.${question.type}`)[2] }}
        </span>
        <span v-else class="text-sm text-gray-600">
          {{ $t(`quiz.questionType.${question.type}`) }}
        </span>
      </div>
      <div v-if="isFinished && !isReviewOnly" class="shrink-0 ml-2">
        <Icon
          v-if="isCorrect"
          name="mdi:check-circle"
          class="text-green-500 text-xl"
        />
        <Icon v-else name="mdi:close-circle" class="text-red-500 text-xl" />
      </div>
    </div>

    <div class="mb-3">
      <div class="font-mono text-xs bg-gray-50 p-2 break-all mb-1">
        {{ question.scramble }}
      </div>
      <CubeCss3d :moves="question.scramble" />
      <div class="text-xs text-gray-400 font-mono mt-1 flex gap-3">
        <span v-if="question.drAxis">{{ $t('quiz.drAxis', { axis: question.drAxis }) }}</span>
        <span v-if="question.lastMove">{{ $t('quiz.lastMove', { move: question.lastMove }) }}</span>
      </div>
    </div>

    <div class="grid grid-cols-1 gap-2">
      <div
        v-for="(o, oi) in question.options"
        :key="oi"
        class="text-left border-2 p-3 transition-all duration-200 flex items-start gap-2"
        :class="[getOptionClass(oi), (isFinished || isReviewOnly) ? '' : 'cursor-pointer']"
        @click="!(isFinished || isReviewOnly) && emit('toggle', oi)"
      >
        <span class="font-bold text-sm shrink-0 w-6 h-6 flex items-center justify-center border" :class="getLabelClass(oi, o)">
          {{ o.label }}
        </span>
        <span class="font-mono text-sm">{{ o.solution }}</span>
        <span v-if="showAnswers && o.correct" class="ml-auto text-green-600 text-xs font-semibold shrink-0">✓</span>
        <span v-if="isFinished && !isReviewOnly && !o.correct && (userAnswers || []).includes(oi)" class="ml-auto text-red-500 text-xs font-semibold shrink-0">✗</span>
      </div>
    </div>
  </div>
</template>
