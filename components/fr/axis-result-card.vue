<script setup lang="ts">
import { AXIS_TAB_LABEL } from '~/utils/fr/display'

import type { AxisResult } from '~/utils/fr/types'

const props = defineProps<{
  result: AxisResult
  active: boolean
  hideSolution?: boolean
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
    <div class="flex justify-between items-center mb-3">
      <h3 class="font-bold text-lg">
        {{ AXIS_TAB_LABEL[result.axisKey] }} {{ $t('tools.frTrainer.axisSuffix') }}
      </h3>
      <span
        v-if="result.inputFalseFr"
        class="inline-block px-2 py-0.5 text-xs rounded border border-red-500 text-red-600 bg-red-50"
      >
        {{ $t('tools.frTrainer.falseFr') }}
      </span>
      <span
        v-else-if="result.alreadyFr"
        class="inline-block px-2 py-0.5 text-xs rounded border border-green-500 text-green-600 bg-green-50"
      >
        {{ $t('tools.frTrainer.alreadyFr') }}
      </span>
      <span
        v-else
        class="inline-block px-2 py-0.5 text-xs rounded bg-indigo-100 text-indigo-700"
      >
        {{ result.caseLabel }}
      </span>
    </div>

    <p class="text-sm text-gray-600 mb-1">
      {{ $t('tools.frTrainer.badEdges') }}：
      <span class="text-gray-900 font-medium">{{ result.badCount }} ({{ result.badTop }}-{{ result.badBottom }})</span>
    </p>
    <p class="text-sm text-gray-600 mb-3">
      {{ $t('tools.frTrainer.corner') }}：
      <span class="text-gray-900 font-medium">{{ result.cornerLabel }}</span>
    </p>

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
          class="text-xs px-2 py-1 border border-indigo-300 text-indigo-600 rounded hover:bg-indigo-50"
          @click.stop="showSteps = !showSteps"
        >
          {{ $t('tools.frTrainer.steps.toggle') }}
        </button>
      </div>
    </template>
  </div>
</template>
