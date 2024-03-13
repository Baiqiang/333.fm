<script setup lang="ts">
import { Algorithm, Cube } from 'insertionfinder'

const props = defineProps<{
  insertions: ChainInsertion[]
  scramble: Scramble
  inverse: boolean
}>()
const insertionStatus = computed(() => props.insertions.map((insertion: ChainInsertion) => {
  const cube = new Cube()
  cube.twist(new Algorithm(props.scramble?.scramble ?? ''))
  console.log(props.scramble)
  try {
    const nextSkeleton = getNextSkeleton(insertion)
    const nextAlg = new Algorithm(nextSkeleton)
    const totalMoves = nextAlg.length
    nextAlg.clearFlags()
    const alg = new Algorithm(formatSkeleton(nextSkeleton))
    cube.twist(alg)
    const phase = getPhase(cube)
    const status = getStatus(cube, phase)
    const insertionAlg = new Algorithm(insertion.insertion)
    const moves = insertionAlg.length * 100
    const cancelMoves = (totalMoves - alg.length) * 100
    const cumulativeMoves = alg.length * 100
    return {
      phase,
      status,
      moves,
      cumulativeMoves,
      cancelMoves,
    }
  }
  catch (e) {
    return {}
  }
}))
function formatSkeleton(skeleton: string) {
  skeleton = formatAlgorithm(skeleton)
  if (props.inverse)
    return reverseTwists(skeleton)
  return skeleton
}
</script>

<template>
  <div>
    <div v-for="insertion, i of insertions" :key="i" class="mb-1">
      <div class="text-sm">
        {{ $t('if.skeleton.label') }}
      </div>
      <ChainSkeleton v-model="insertion.insertPlace" :skeleton="insertion.skeleton" :inverse="inverse" disabled />
      <div class="text-sm">
        {{ $t('if.solutions.insertion') }}
      </div>
      <ChainPhase v-bind="insertionStatus[i]" :solution="insertion.insertion" comment />
    </div>
  </div>
</template>
