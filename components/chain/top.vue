<script setup lang="ts">
import { Algorithm } from 'insertionfinder'

defineProps<{
  scramble: Scramble
  submissions: Submission[]
}>()
function getFinalSolution(submission: Submission) {
  let skeletonAlg: Algorithm

  if (submission.phase === SubmissionPhase.INSERTIONS)
    skeletonAlg = new Algorithm(getNextSkeleton(submission.insertions[submission.insertions.length - 1]))
  else
    skeletonAlg = new Algorithm(flattenSkeleton(submission))

  skeletonAlg.clearFlags()
  return skeletonAlg.toString()
}
</script>

<template>
  <div>
    <div class="font-bold">
      {{ $t('chain.bestResult') }}
    </div>
    <div v-for="submission in submissions" :key="submission.id" class="mt-2 pt-2 border-t">
      <div class="text-sm">
        {{ $t('if.solutions.final') }}
      </div>
      <Sequence :sequence="`${getFinalSolution(submission)} (${formatResult(submission.cumulativeMoves)})`" />
      <div class="text-sm mt-1">
        {{ $t('weekly.comment.label') }}
      </div>
      <ChainPhase
        v-for="phase, i in flattenPhases(scramble, submission)"
        :key="`${submission.id}-${i}`"
        :class="{ 'mt-2': phase.phase === SubmissionPhase.INSERTIONS }"
        v-bind="phase"
        comment
        link
      />
    </div>
  </div>
</template>
