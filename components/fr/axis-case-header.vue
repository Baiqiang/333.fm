<script setup lang="ts">
import { AXIS_TAB_LABEL } from '~/utils/fr/display'

import type { AxisResult } from '~/utils/fr/types'

defineProps<{
  result: AxisResult
}>()
</script>

<template>
  <div class="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-indigo-50 dark:bg-gray-800 dark:border dark:border-gray-700 rounded">
    <p class="text-xl font-bold text-gray-900 leading-tight">
      {{ AXIS_TAB_LABEL[result.axisKey] }} {{ $t('tools.frTrainer.axisSuffix') }}
      <span
        v-if="!result.inputFalseFr && !result.alreadyFr"
        class="text-gray-600 dark:text-gray-300"
      >
        · {{ result.caseLabel }}
      </span>
    </p>
    <span
      v-if="result.inputFalseFr"
      class="inline-block px-2 py-0.5 text-xs rounded border border-red-500 text-red-600 bg-red-50 shrink-0"
    >
      {{ $t('tools.frTrainer.falseFr') }}
    </span>
    <span
      v-else-if="result.alreadyFr"
      class="inline-block px-2 py-0.5 text-xs rounded border border-green-500 text-green-600 bg-green-50 shrink-0"
    >
      {{ $t('tools.frTrainer.alreadyFr') }}
    </span>
  </div>
</template>
