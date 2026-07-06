<script setup lang="ts">
import type { SolutionStep } from '~/utils/fr/types'

defineProps<{
  steps: SolutionStep[]
  shapeSteps?: SolutionStep[] | null
}>()
</script>

<template>
  <div v-if="shapeSteps && shapeSteps.length > 0" class="space-y-3">
    <div>
      <p class="text-xs text-amber-600 dark:text-amber-400 font-semibold mb-2">
        {{ $t('tools.frTrainer.steps.shapeTitle') }}
      </p>
      <FrSolutionSteps :steps="shapeSteps" />
    </div>
    <hr class="border-gray-200 dark:border-gray-700">
    <div>
      <p class="text-xs text-green-600 dark:text-green-400 font-semibold mb-2">
        {{ $t('tools.frTrainer.steps.trueTitle') }}
      </p>
      <FrSolutionSteps :steps="steps" />
    </div>
  </div>
  <FrSolutionSteps v-else :steps="steps" />
</template>
