<script setup lang="ts">
const props = defineProps<{
  submission: Submission
  chain?: boolean
}>()
const isChain = computed(() => props.chain || props.submission.competition?.type === CompetitionType.FMC_CHAIN)
const isRegular = computed(() => props.submission.mode === CompetitionMode.REGULAR && !isChain.value)
const isUnlimited = computed(() => props.submission.mode === CompetitionMode.UNLIMITED && !isChain.value)
const isFinished = computed(() => isChain.value && (props.submission.phase === SubmissionPhase.FINISHED || props.submission.phase === SubmissionPhase.INSERTIONS))
const moves = computed(() => {
  let moves = formatResult(props.submission.moves)
  if (!isChain.value)
    return moves
  const submission = props.submission
  if (submission.cancelMoves > 0)
    moves += `-${formatResult(submission.cancelMoves)}`
  if (submission.cumulativeMoves > 0)
    moves += `/${formatResult(submission.cumulativeMoves)}`
  return moves
})
</script>

<template>
  <div
    v-if="submission.moves !== DNF"
    class="whitespace-nowrap"
    :class="{
      'text-indigo-500 font-bold': isRegular,
      'text-orange-500 font-bold': isUnlimited,
      'text-green-500 font-bold': isFinished,
    }"
  >
    {{ moves }}
  </div>
  <div v-else class="text-gray-500 font-bold">
    DNF
  </div>
</template>
