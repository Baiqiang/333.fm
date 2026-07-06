<script setup lang="ts">
import type { SolutionStep } from '~/utils/fr/types'

defineProps<{
  steps: SolutionStep[]
}>()
</script>

<template>
  <div class="space-y-2">
    <div
      v-for="(step, index) in steps"
      :key="index"
      class="flex gap-3 items-start"
    >
      <span
        class="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
        :class="index === steps.length - 1
          ? (step.trueFr ? 'bg-green-500 text-white' : 'bg-amber-500 text-white')
          : 'bg-indigo-500 text-white'"
      >
        {{ index + 1 }}
      </span>
      <div
        class="flex-1 border rounded-md px-3 py-2 text-sm"
        :class="index === steps.length - 1
          ? (step.trueFr ? 'border-green-400 bg-green-50 dark:bg-green-950/30' : 'border-amber-400 bg-amber-50 dark:bg-amber-950/30')
          : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900'"
      >
        <div class="grid grid-cols-[3.25rem_1fr] gap-3 items-center">
          <span
            class="font-mono font-bold text-center py-1 rounded text-sm"
            :class="step.move ? 'bg-indigo-500 text-white' : 'border border-gray-300 text-gray-500 text-xs'"
          >
            {{ step.move ?? $t('tools.frTrainer.steps.start') }}
          </span>
          <div>
            <p class="font-medium">
              {{ step.caseLabel }}
            </p>
            <p
              v-if="index === steps.length - 1"
              class="font-semibold mt-0.5"
              :class="step.trueFr ? 'text-green-600' : 'text-amber-600'"
            >
              {{ step.trueFr ? $t('tools.frTrainer.steps.frDone') : $t('tools.frTrainer.steps.falseFrDone') }}
            </p>
            <p
              v-if="index < steps.length - 1 && step.trigger"
              class="text-xs text-gray-600 dark:text-gray-400 mt-1 px-2 py-1 border border-indigo-300 rounded bg-indigo-50 dark:bg-indigo-950/30"
            >
              {{ $t('tools.frTrainer.steps.triggerHint', { alg: step.trigger }) }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
