<script setup lang="ts">
import type { AxisKey, FrAnalysis, PreviewStep } from '~/utils/fr/types'
import { analyzeScramble, generateHtrScramble } from '~/utils/fr'

import { AXIS_TAB_LABEL, AXIS_TABS } from '~/utils/fr/display'

const helpOpen = defineModel<boolean>('helpOpen', { default: false })

const scramble = ref('')
const solution = ref('')
const analysis = ref<FrAnalysis | null>(null)
const activeAxis = ref<AxisKey>('ud')
const previewStep = ref<PreviewStep | null>(null)
const leaveSlice = useLocalStorage('tool.frTrainer.analyze.leaveSlice', true)

const localForm = useLocalStorage('tool.frTrainer.analyze', { scramble: '', solution: '' })

watch([scramble, solution], ([s, sol]) => {
  localForm.value = { scramble: s, solution: sol }
})

function runAnalyze() {
  analysis.value = analyzeScramble(scramble.value, solution.value, leaveSlice.value)
  activeAxis.value = 'ud'
  previewStep.value = null
}

watch(activeAxis, () => {
  previewStep.value = null
})

watchDebounced([scramble, solution, leaveSlice], () => {
  if (!scramble.value.trim() && !solution.value.trim()) {
    analysis.value = null
    return
  }
  runAnalyze()
}, { debounce: 300 })

function handleRandom() {
  solution.value = generateHtrScramble()
  scramble.value = ''
}

onMounted(() => {
  const stored = localForm.value
  if (!stored.solution && stored.scramble) {
    solution.value = stored.scramble
    scramble.value = ''
    localForm.value = { scramble: '', solution: stored.scramble }
  }
  else {
    scramble.value = stored.scramble
    solution.value = stored.solution
  }

  if (!solution.value.trim())
    handleRandom()
})

const showCube = computed(() => analysis.value?.ok && analysis.value.isHtr)
const activeResult = computed(() =>
  analysis.value?.axes.find(a => a.axisKey === activeAxis.value) ?? null,
)

const previewMoves = computed((): string[] | null => {
  if (!previewStep.value || !activeResult.value)
    return null

  const { track, index } = previewStep.value
  if (index <= 0)
    return []

  const moves = track === 'shape'
    ? activeResult.value.shapeSolution
    : activeResult.value.solution
  if (!moves)
    return null
  return moves.slice(0, index)
})
</script>

<template>
  <div class="space-y-6">
    <FrScrambleInput
      v-model:scramble="scramble"
      v-model:solution="solution"
      @random="handleRandom"
      @help="helpOpen = true"
    />

    <div class="flex items-center gap-3">
      <button
        type="button"
        role="switch"
        :aria-checked="leaveSlice"
        class="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors"
        :class="leaveSlice ? 'bg-indigo-500' : 'bg-gray-300'"
        @click="leaveSlice = !leaveSlice"
      >
        <span
          class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
          :class="leaveSlice ? 'translate-x-6' : 'translate-x-1'"
        />
      </button>
      <div class="text-sm">
        <span class="font-medium text-gray-700">{{ $t('tools.frTrainer.leaveSliceMode') }}</span>
        <span class="ml-2 text-gray-500">{{ $t('tools.frTrainer.leaveSliceHint') }}</span>
      </div>
    </div>

    <FrHelpDialog v-model:open="helpOpen" />

    <div
      v-if="analysis && !analysis.ok"
      class="p-3 border border-red-400 text-red-600 rounded text-sm bg-red-50"
    >
      {{ $t('tools.frTrainer.error.parse', { token: analysis.errorToken ?? '' }) }}
    </div>

    <div
      v-if="analysis?.ok && !analysis.isHtr"
      class="p-3 border border-amber-400 text-amber-700 rounded text-sm bg-amber-50"
    >
      {{ $t('tools.frTrainer.error.notHtr') }}
    </div>

    <template v-if="showCube">
      <div class="bg-white shadow-md p-4 w-full">
        <FrCube
          :scramble="analysis!.scramble"
          :axis-key="activeAxis"
          :leave-slice="leaveSlice"
          :preview-moves="previewMoves"
        />
      </div>

      <div class="space-y-3">
        <p class="text-sm text-gray-600">
          {{ $t('tools.frTrainer.highlightTip') }}
        </p>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="ax in AXIS_TABS"
            :key="ax"
            type="button"
            class="px-3 py-1 text-sm rounded border transition-colors"
            :class="activeAxis === ax
              ? 'bg-indigo-500 text-white border-indigo-500'
              : 'border-gray-300 hover:border-indigo-300'"
            @click="activeAxis = ax"
          >
            {{ AXIS_TAB_LABEL[ax] }}
          </button>
        </div>
      </div>

      <FrAxisResultCard
        v-if="activeResult"
        :key="activeAxis"
        :result="activeResult"
        active
        :preview-step="previewStep"
        @update:preview-step="previewStep = $event"
      />
    </template>
  </div>
</template>
