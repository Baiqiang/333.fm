<script setup lang="ts">
import { SubmissionPhase } from '~/utils/competition'

const props = defineProps<{
  submission?: Submission
  scramble?: Scramble
  solution?: string
  phase?: SubmissionPhase
  status?: string
  moves?: number
  cumulativeMoves?: number
  cancelMoves?: number
  comment?: boolean
  link?: boolean
  showUser?: boolean
}>()
const route = useRoute()
const currentPhase = computed(() => props.submission?.phase ?? props.phase!)
const number = computed(() => (props.submission?.scramble ?? props.scramble)?.number ?? route.params.number)
const phaseString = computed(() => {
  let str = ''
  const phase = currentPhase.value
  switch (phase) {
    case SubmissionPhase.DR:
    case SubmissionPhase.EO:
    case SubmissionPhase.HTR:
    case SubmissionPhase.FINISHED:
      str += SubmissionPhase[phase]
      break
  }
  if (props.status)
    str += `${str ? '-' : ''}${props.status}`

  if (props.moves) {
    str += `${str ? ' ' : ''}(${formatResult(props.moves)}`
    if (props.cancelMoves)
      str += `-${formatResult(props.cancelMoves)}`

    if (props.cumulativeMoves)
      str += `/${formatResult(props.cumulativeMoves)}`

    str += ')'
  }
  return props.comment ? `//${str}` : str
})
const phaseHTML = computed(() => {
  return ` <span${props.comment ? ' class="text-gray-400"' : ''}>${phaseString.value}</span>`
})
const to = computed(() => props.link && currentPhase.value !== SubmissionPhase.INSERTIONS
  ? `/chain/${number.value}/${props.submission?.id}`
  : undefined)
const isInsertion = computed(() => (props.submission?.phase ?? props.phase) === SubmissionPhase.INSERTIONS)
</script>

<template>
  <div>
    <NuxtLink v-if="to" :to="to">
      <div v-if="!isInsertion" class="flex gap-x-1 flex-wrap">
        <Sequence :sequence="(submission?.solution ?? solution ?? '').replaceAll(/\s+/g, ' ') + phaseHTML" html />
      </div>
      <SubmissionInsertions
        v-else
        :insertions="submission!.insertions"
        :scramble="scramble ?? submission!.scramble"
        :inverse="submission!.inverse"
      />
    </NuxtLink>
    <template v-else>
      <div v-if="!isInsertion" class="flex gap-x-1 flex-wrap">
        <Sequence :sequence="(submission?.solution ?? solution ?? '').replaceAll(/\s+/g, ' ') + phaseHTML" html />
      </div>
      <SubmissionInsertions
        v-else
        :insertions="submission!.insertions"
        :scramble="scramble ?? submission!.scramble"
        :inverse="submission!.inverse"
      />
    </template>
  </div>
</template>
