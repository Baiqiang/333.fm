<script setup lang="ts">
import type { AxisResult } from '~/utils/fr/types'

const props = defineProps<{
  result: AxisResult
  active: boolean
  hideSolution?: boolean
  hideHeader?: boolean
}>()

const emit = defineEmits<{
  select: []
}>()

const showSteps = ref(false)

const hasSteps = computed(() => {
  if (props.hideSolution)
    return false
  return (props.result.decomposition && props.result.decomposition.length > 1)
    || (props.result.shapeDecomposition && props.result.shapeDecomposition.length > 0)
})
</script>

<template>
  <div
    class="bg-white shadow-md p-4 border-l-4 cursor-pointer transition-colors"
    :class="active ? 'border-indigo-500' : 'border-gray-300'"
    @click="emit('select')"
  >
    <FrAxisCaseHeader
      v-if="!hideHeader"
      :result="result"
      class="mb-3 -mx-1"
    />

    <template v-if="!hideSolution">
      <div v-if="result.shapeIsFalseFr && result.shapeSolution && result.solution" class="mb-3">
        <p class="text-sm text-amber-600 mb-0.5">
          {{ $t('tools.frTrainer.falseFrSolution') }}：
        </p>
        <p class="font-mono font-semibold mb-2">
          {{ result.shapeSolution.join(' ') }}
        </p>
        <p class="text-sm text-green-600 mb-0.5">
          {{ $t('tools.frTrainer.correctSolution') }}：
        </p>
        <p class="font-mono font-semibold">
          {{ result.solution.join(' ') }}
        </p>
      </div>
      <template v-else>
        <p class="text-sm text-gray-600 mb-1">
          {{ $t('tools.frTrainer.solution') }}：
        </p>
        <p class="font-mono font-semibold min-h-6 mb-3">
          <template v-if="result.solution === null">
            {{ $t('tools.frTrainer.noSolution') }}
          </template>
          <template v-else-if="result.solution.length === 0">
            {{ $t('tools.frTrainer.alreadyFr') }}
          </template>
          <template v-else>
            {{ result.solution.join(' ') }}
          </template>
        </p>
        <p v-if="result.inputFalseFr" class="text-xs text-amber-600 mb-3">
          {{ $t('tools.frTrainer.inputFalseFrNote') }}
        </p>
      </template>

      <FrSolutionBreakdown
        v-if="hasSteps && showSteps"
        :steps="result.decomposition"
        :shape-steps="result.shapeDecomposition"
        class="mb-3"
      />

      <div v-if="hasSteps" class="text-right">
        <button
          type="button"
          class="text-xs px-2 py-1 border border-gray-300 rounded hover:border-indigo-300"
          @click.stop="showSteps = !showSteps"
        >
          {{ $t('tools.frTrainer.steps.toggle') }}
        </button>
      </div>
    </template>
  </div>
</template>
