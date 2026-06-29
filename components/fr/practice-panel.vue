<script setup lang="ts">
import { appendFrPracticeRecord } from '~/composables/fr-practice-history'
import type { FrAxisMode, FrPracticeRecord } from '~/composables/fr-practice-history'
import { analyzeScramble, generateHtrScramble, parsePracticeSolutionInput, verifyFrSolution } from '~/utils/fr'

import { AXIS_TAB_LABEL, AXIS_TABS } from '~/utils/fr/display'
import type { AxisKey, FrAnalysis, VerifyFrResult } from '~/utils/fr/types'

const emit = defineEmits<{
  historyChange: []
  help: []
}>()

const analysis = ref<FrAnalysis | null>(null)
const axisKey = ref<AxisKey>('ud')
const axisMode = ref<FrAxisMode>('pick')
const userSolution = ref('')
const submitted = ref(false)
const verifyResult = ref<VerifyFrResult | null>(null)

function pickRandomAxis(): AxisKey {
  return AXIS_TABS[Math.floor(Math.random() * AXIS_TABS.length)]!
}

function loadScramble(scramble: string, assignRandomAxis = false) {
  const result = analyzeScramble(scramble)
  analysis.value = result
  userSolution.value = ''
  submitted.value = false
  verifyResult.value = null
  if (assignRandomAxis) {
    axisMode.value = 'random'
    axisKey.value = pickRandomAxis()
  }
}

function handleRandom() {
  loadScramble(generateHtrScramble(), true)
}

onMounted(() => {
  handleRandom()
})

function resetAttempt() {
  userSolution.value = ''
  submitted.value = false
  verifyResult.value = null
}

function handleRandomAxis() {
  axisMode.value = 'random'
  axisKey.value = pickRandomAxis()
  resetAttempt()
}

function handleAxisPick(ax: AxisKey) {
  if (ax === axisKey.value && axisMode.value === 'pick')
    return
  axisMode.value = 'pick'
  axisKey.value = ax
  resetAttempt()
}

const activeResult = computed(() => analysis.value?.axes.find(a => a.axisKey === axisKey.value) ?? null)
const showCube = computed(() => analysis.value?.ok && analysis.value.isHtr)

const liveInput = computed(() => {
  if (!analysis.value?.ok || !analysis.value.isHtr || submitted.value)
    return null
  return parsePracticeSolutionInput(analysis.value.scramble, userSolution.value, axisKey.value)
})

const canSubmit = computed(() =>
  showCube.value
  && !submitted.value
  && userSolution.value.trim().length > 0
  && liveInput.value?.status !== 'invalid',
)

const inputBorderClass = computed(() => {
  if (!liveInput.value)
    return 'border-gray-300'
  if (liveInput.value.status === 'invalid')
    return 'border-red-500'
  if (liveInput.value.status === 'trueFr')
    return 'border-green-500'
  if (liveInput.value.status === 'falseFr')
    return 'border-amber-500'
  return 'border-gray-300'
})

function handleSubmit() {
  if (!analysis.value?.ok || !analysis.value.isHtr)
    return
  const result = verifyFrSolution(analysis.value.scramble, userSolution.value, axisKey.value)
  verifyResult.value = result
  submitted.value = true

  const axisResult = analysis.value.axes.find(a => a.axisKey === axisKey.value)
  if (axisResult) {
    appendFrPracticeRecord({
      scramble: analysis.value.scramble,
      axisKey: axisKey.value,
      axisMode: axisMode.value,
      userSolution: userSolution.value.trim(),
      correct: result.ok && result.correct,
      caseLabel: axisResult.caseLabel,
      referenceSolution: axisResult.solution,
      userMoveCount: result.userMoves.length,
      referenceMoveCount: axisResult.solution?.length ?? null,
    })
    emit('historyChange')
  }
}

function replayFromHistory(record: FrPracticeRecord) {
  analysis.value = analyzeScramble(record.scramble)
  axisKey.value = record.axisKey
  axisMode.value = record.axisMode
  userSolution.value = record.userSolution
  verifyResult.value = verifyFrSolution(record.scramble, record.userSolution, record.axisKey)
  submitted.value = true
}

defineExpose({ replayFromHistory })
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-wrap gap-2">
      <button
        type="button"
        class="px-3 py-1 border border-indigo-300 text-indigo-600 rounded text-sm hover:bg-indigo-50"
        @click="handleRandom"
      >
        {{ $t('tools.frTrainer.btn.random') }}
      </button>
      <button
        type="button"
        class="ml-auto px-3 py-1 border border-gray-300 rounded text-sm"
        @click="emit('help')"
      >
        {{ $t('tools.frTrainer.btn.help') }}
      </button>
    </div>

    <div
      v-if="analysis && !analysis.ok"
      class="p-3 border border-red-400 text-red-600 rounded text-sm"
    >
      {{ $t('tools.frTrainer.error.parse', { token: analysis.errorToken ?? '' }) }}
    </div>

    <div
      v-if="analysis?.ok && !analysis.isHtr"
      class="p-3 border border-amber-400 text-amber-700 rounded text-sm"
    >
      {{ $t('tools.frTrainer.error.notHtr') }}
    </div>

    <template v-if="showCube">
      <p class="font-mono text-sm text-gray-600 break-all">
        {{ analysis!.scramble }}
      </p>

      <div class="bg-white shadow-md p-4 border-l-4 border-indigo-500">
        <p class="text-sm font-medium mb-3">
          {{ $t('tools.frTrainer.practice.axisPrompt') }}
        </p>
        <div class="flex flex-wrap gap-2 items-center">
          <button
            v-for="ax in AXIS_TABS"
            :key="ax"
            type="button"
            class="px-3 py-1 text-sm rounded border"
            :class="axisKey === ax && axisMode === 'pick'
              ? 'bg-indigo-500 text-white border-indigo-500'
              : 'border-gray-300'"
            @click="handleAxisPick(ax)"
          >
            {{ AXIS_TAB_LABEL[ax] }}
          </button>
          <button
            type="button"
            class="px-3 py-1 text-sm border border-indigo-300 text-indigo-600 rounded"
            @click="handleRandomAxis"
          >
            {{ $t('tools.frTrainer.practice.randomAxis') }}
          </button>
          <span v-if="axisMode === 'random'" class="text-xs text-gray-500">
            {{ $t('tools.frTrainer.practice.randomAxisHint') }}
          </span>
        </div>
      </div>

      <div class="grid lg:grid-cols-2 gap-6">
        <div class="bg-white shadow-md p-4">
          <FrCube
            :scramble="analysis!.scramble"
            :axis-key="axisKey"
            :preview-moves="!submitted && liveInput?.appliedMoves.length ? liveInput.appliedMoves : null"
            :solution="submitted ? activeResult?.solution : null"
          />
        </div>

        <div class="space-y-4">
          <FrAxisResultCard
            v-if="activeResult"
            :result="activeResult"
            active
            :hide-solution="!submitted"
            @select="() => {}"
          />

          <div v-if="!submitted">
            <p class="text-sm font-medium mb-2">
              {{ $t('tools.frTrainer.practice.solutionInput') }}
            </p>
            <textarea
              v-model="userSolution"
              class="w-full font-mono border-2 rounded p-2 focus:outline-none"
              :class="inputBorderClass"
              :placeholder="$t('tools.frTrainer.practice.solutionPlaceholder')"
              rows="3"
              @keydown.meta.enter="canSubmit && handleSubmit()"
              @keydown.ctrl.enter="canSubmit && handleSubmit()"
            />
            <p v-if="liveInput?.status === 'invalid' && liveInput.invalidToken" class="text-xs text-red-600 mt-1">
              {{ $t('tools.frTrainer.practice.liveInvalid', { token: liveInput.invalidToken }) }}
            </p>
            <p v-if="liveInput?.status === 'trueFr'" class="text-xs text-green-600 mt-1 font-medium">
              {{ $t('tools.frTrainer.practice.liveTrueFr') }}
            </p>
            <p v-if="liveInput?.status === 'falseFr'" class="text-xs text-amber-600 mt-1">
              {{ $t('tools.frTrainer.practice.liveFalseFr') }}
            </p>
            <ButtonPrimary
              type="button"
              class="mt-3"
              :disabled="!canSubmit"
              @click="handleSubmit"
            >
              {{ $t('tools.frTrainer.practice.submit') }}
            </ButtonPrimary>
          </div>

          <div v-else-if="verifyResult" class="space-y-3">
            <div
              class="p-3 border rounded text-sm"
              :class="verifyResult.ok && verifyResult.correct
                ? 'border-green-400 text-green-700 bg-green-50'
                : verifyResult.falseFr
                  ? 'border-amber-400 text-amber-700 bg-amber-50'
                  : 'border-red-400 text-red-600 bg-red-50'"
            >
              <template v-if="!verifyResult.ok">
                {{ $t('tools.frTrainer.error.parse', { token: verifyResult.errorToken ?? '' }) }}
              </template>
              <template v-else-if="verifyResult.correct">
                {{ $t('tools.frTrainer.practice.resultCorrect') }}
              </template>
              <template v-else-if="verifyResult.falseFr">
                {{ $t('tools.frTrainer.practice.resultFalseFr') }}
              </template>
              <template v-else>
                {{ $t('tools.frTrainer.practice.resultWrong') }}
              </template>
            </div>

            <div v-if="activeResult">
              <p class="text-sm text-gray-600 mb-1">
                {{ $t('tools.frTrainer.practice.yourSolution') }}：
              </p>
              <p class="font-mono font-semibold">
                {{ userSolution.trim() || $t('tools.frTrainer.alreadyFr') }}
              </p>

              <div
                v-if="activeResult.decomposition && activeResult.decomposition.length > 1"
                class="mt-3"
              >
                <p class="text-sm font-medium mb-2">
                  {{ $t('tools.frTrainer.steps.toggle') }}
                </p>
                <FrSolutionBreakdown
                  :steps="activeResult.decomposition"
                  :shape-steps="activeResult.shapeDecomposition"
                />
              </div>

              <button
                type="button"
                class="mt-3 px-3 py-1 border border-indigo-300 text-indigo-600 rounded text-sm"
                @click="handleRandom"
              >
                {{ $t('tools.frTrainer.practice.next') }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
