<script setup lang="ts">
import { analyzeScramble, generateHtrScramble } from '~/utils/fr'
import { AXIS_TAB_LABEL, AXIS_TABS } from '~/utils/fr/display'

import type { AxisKey, FrAnalysis } from '~/utils/fr/types'

const helpOpen = defineModel<boolean>('helpOpen', { default: false })

const scramble = ref('')
const solution = ref('')
const analysis = ref<FrAnalysis | null>(null)
const activeAxis = ref<AxisKey>('ud')

const localForm = useLocalStorage('tool.frTrainer.analyze', { scramble: '', solution: '' })

watch([scramble, solution], ([s, sol]) => {
  localForm.value = { scramble: s, solution: sol }
})

function runAnalyze() {
  analysis.value = analyzeScramble(scramble.value, solution.value)
  activeAxis.value = 'ud'
}

function handleRandom() {
  solution.value = generateHtrScramble()
  scramble.value = ''
  runAnalyze()
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

  if (solution.value.trim())
    runAnalyze()
  else
    handleRandom()
})

const activeResult = computed(() => analysis.value?.axes.find(a => a.axisKey === activeAxis.value) ?? null)
const showCube = computed(() => analysis.value?.ok && analysis.value.isHtr)
</script>

<template>
  <div class="space-y-6">
    <FrScrambleInput
      v-model:scramble="scramble"
      v-model:solution="solution"
      @analyze="runAnalyze"
      @random="handleRandom"
      @help="helpOpen = true"
    />

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
          :solution="activeResult?.solution"
        />
      </div>

      <div class="space-y-3 lg:hidden">
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

      <div class="grid md:grid-cols-3 gap-4">
        <FrAxisResultCard
          v-for="res in analysis!.axes"
          :key="res.axisKey"
          :result="res"
          :active="activeAxis === res.axisKey"
          @select="activeAxis = res.axisKey"
        />
      </div>
    </template>
  </div>
</template>
