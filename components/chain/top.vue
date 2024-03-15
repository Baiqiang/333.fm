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
      {{ $t('chain.bestResults') }}
    </div>
    <div v-for="submission in submissions" :key="submission.id" class="mt-2 pt-2 border-t">
      <div class="text-sm">
        {{ $t('if.solutions.final') }}
      </div>
      <Sequence :sequence="`${getFinalSolution(submission)} (${formatResult(submission.cumulativeMoves)})`" />
      <div class="text-sm mt-1">
        {{ $t('weekly.comment.label') }}
      </div>
      <div
        v-for="phase, i in flattenPhases(scramble, submission)"
        :key="`${submission.id}-${i}`"
        class="flex gap-x-2 flex-wrap"
      >
        <ChainPhase
          :class="{ 'mt-2 w-full': phase.phase === SubmissionPhase.INSERTIONS }"
          v-bind="phase"
          comment
          link
        />
        <UserAvatarName :user="phase.submission.user" class="text-sm" :size="4" />
      </div>
    </div>
  </div>
</template>
