<script setup lang="ts">
import { clearFrPracticeHistory, getFrPracticeHistory } from '~/composables/fr-practice-history'
import type { FrPracticeRecord } from '~/composables/fr-practice-history'

import { AXIS_TAB_LABEL } from '~/utils/fr/display'

const emit = defineEmits<{
  replay: [record: FrPracticeRecord]
}>()

const records = ref(getFrPracticeHistory())
const selectedId = ref<string | null>(null)

function refresh() {
  records.value = getFrPracticeHistory()
}

function handleClear() {
  clearFrPracticeHistory()
  selectedId.value = null
  refresh()
}

function handleReplay(record: FrPracticeRecord) {
  selectedId.value = record.id
  emit('replay', record)
}

defineExpose({ refresh })
</script>

<template>
  <div class="bg-white shadow-md p-4 border-l-4 border-gray-300 mt-6">
    <div class="flex justify-between items-center mb-3">
      <h3 class="font-semibold">
        {{ $t('tools.frTrainer.practice.historyTitle') }}
      </h3>
      <button
        v-if="records.length"
        type="button"
        class="text-xs text-gray-500 hover:text-red-500"
        @click="handleClear"
      >
        {{ $t('tools.frTrainer.practice.historyClear') }}
      </button>
    </div>

    <p v-if="!records.length" class="text-sm text-gray-500">
      {{ $t('tools.frTrainer.practice.historyEmpty') }}
    </p>

    <ul v-else class="space-y-2 max-h-64 overflow-y-auto text-sm">
      <li
        v-for="r in records"
        :key="r.id"
        class="border rounded p-2 cursor-pointer transition-colors hover:border-indigo-300"
        :class="selectedId === r.id
          ? 'border-indigo-500 bg-indigo-50/50'
          : r.correct ? 'border-green-300 bg-green-50/50' : 'border-gray-200'"
        @click="handleReplay(r)"
      >
        <div class="flex justify-between gap-2">
          <span class="font-mono text-xs truncate flex-1">{{ r.scramble }}</span>
          <span
            class="shrink-0 text-xs px-1.5 rounded"
            :class="r.correct ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'"
          >
            {{ r.correct ? '✓' : '✗' }}
          </span>
        </div>
        <p class="text-xs text-gray-500 mt-1">
          {{ AXIS_TAB_LABEL[r.axisKey] }} · {{ r.caseLabel }}
          · {{ r.userMoveCount }}/{{ r.referenceMoveCount ?? '?' }} {{ $t('tools.frTrainer.practice.moves') }}
        </p>
        <p v-if="r.userSolution" class="text-xs font-mono text-gray-700 mt-1 truncate">
          {{ r.userSolution }}
        </p>
      </li>
    </ul>
  </div>
</template>
