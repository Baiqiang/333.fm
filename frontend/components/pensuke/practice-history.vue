<script setup lang="ts">
import type { PensukePracticeRecord } from '~/composables/pensuke-practice-history'
import {
  clearPensukePracticeHistory,
  getPensukePracticeHistory,
} from '~/composables/pensuke-practice-history'
import { AXIS_TAB_LABEL } from '~/utils/pensuke/display'

const emit = defineEmits<{
  replay: [record: PensukePracticeRecord]
}>()

const records = ref<PensukePracticeRecord[]>([])

function refresh() {
  records.value = getPensukePracticeHistory()
}

onMounted(refresh)

defineExpose({ refresh })

function handleClear() {
  clearPensukePracticeHistory()
  refresh()
}
</script>

<template>
  <div v-if="records.length" class="mt-8 border-t pt-6">
    <div class="flex items-center justify-between mb-3">
      <h3 class="font-semibold text-sm">
        {{ $t('tools.pensukeTrainer.practice.historyTitle') }}
      </h3>
      <button
        type="button"
        class="text-xs text-gray-500 hover:text-red-500"
        @click="handleClear"
      >
        {{ $t('tools.pensukeTrainer.practice.historyClear') }}
      </button>
    </div>
    <p v-if="records.length === 0" class="text-sm text-gray-500">
      {{ $t('tools.pensukeTrainer.practice.historyEmpty') }}
    </p>
    <ul class="space-y-2">
      <li
        v-for="r in records"
        :key="r.id"
        class="text-sm border p-2 flex flex-wrap gap-2 items-center cursor-pointer hover:border-indigo-300"
        @click="emit('replay', r)"
      >
        <span
          class="px-1.5 py-0.5 text-xs font-semibold"
          :class="r.correct ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'"
        >
          {{ r.correct ? '✓' : '✗' }}
        </span>
        <span class="text-gray-500 text-xs">
          FR {{ AXIS_TAB_LABEL[r.frAxis] }}
        </span>
        <span class="font-mono text-xs truncate flex-1">
          {{ r.scramble }}
        </span>
        <span class="text-xs text-gray-400">
          · {{ r.userMoveCount }}/{{ r.referenceMoveCount ?? '?' }} {{ $t('tools.pensukeTrainer.practice.moves') }}
        </span>
      </li>
    </ul>
  </div>
</template>
