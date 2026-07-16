<script setup lang="ts">
import type { PensukeAxisMode, PensukePracticeRecord } from '~/composables/pensuke-practice-history'
import type { AxisKey } from '~/utils/pensuke/types'
import { appendPensukePracticeRecord } from '~/composables/pensuke-practice-history'
import {
  generateHtrScramble,
  parsePensukeInput,
  parsePensukePracticeInput,
  solveLeaveSlice,
  verifyLsSolutionSync,
} from '~/utils/pensuke'
import { AXIS_TAB_LABEL, AXIS_TABS } from '~/utils/pensuke/display'

const emit = defineEmits<{
  historyChange: []
}>()

const scramble = ref('')
const frAxis = ref<AxisKey>('ud')
const frAxisMode = ref<PensukeAxisMode>('pick')
const userSolution = ref('')
const submitted = ref(false)
const verifyResult = ref<ReturnType<typeof verifyLsSolutionSync> | null>(null)
const showKeyboard = ref(false)
const isHtr = ref(false)
const parseOk = ref(true)

const lsAxis = computed(() => frAxis.value)

const { appendMove, deleteLastMove, clearSolution, handleSolutionKeydown } = useCubeMoveInput(userSolution)

function pickRandomAxis(): AxisKey {
  return AXIS_TABS[Math.floor(Math.random() * AXIS_TABS.length)]!
}

function loadScramble(s: string, randomFrAxis = false) {
  const parsed = parsePensukeInput(s, '')
  parseOk.value = parsed.ok
  isHtr.value = parsed.ok && parsed.isHtr
  scramble.value = s
  userSolution.value = ''
  submitted.value = false
  verifyResult.value = null
  if (randomFrAxis) {
    frAxisMode.value = 'random'
    frAxis.value = pickRandomAxis()
  }
}

function handleRandom() {
  loadScramble(generateHtrScramble(16), true)
}

onMounted(() => {
  handleRandom()
})

const referenceSolution = computed(() => {
  const parsed = parsePensukeInput(scramble.value, '')
  if (!parsed.ok || !parsed.state)
    return null
  const sols = solveLeaveSlice(parsed.state, lsAxis.value, frAxis.value, 14, parsed.scrambleMoves)
  return sols[0]?.moves ?? null
})

const liveInput = computed(() => {
  if (!isHtr.value || submitted.value)
    return null
  return parsePensukePracticeInput(scramble.value, userSolution.value, lsAxis.value)
})

const canSubmit = computed(() =>
  isHtr.value
  && !submitted.value
  && userSolution.value.trim().length > 0
  && liveInput.value?.status !== 'invalid',
)

const solutionMoveCount = computed(() => liveInput.value?.appliedMoves.length ?? 0)

function handleKeydown(e: KeyboardEvent) {
  handleSolutionKeydown(e, canSubmit.value, handleSubmit)
}

function handleSubmit() {
  verifyResult.value = verifyLsSolutionSync(scramble.value, userSolution.value, frAxis.value)
  submitted.value = true
  appendPensukePracticeRecord({
    scramble: scramble.value,
    lsAxis: frAxis.value,
    frAxis: frAxis.value,
    axisMode: frAxisMode.value,
    userSolution: userSolution.value.trim(),
    correct: verifyResult.value.ok && verifyResult.value.correct,
    userMoveCount: verifyResult.value.userMoves.length,
    referenceMoveCount: referenceSolution.value?.length ?? null,
  })
  emit('historyChange')
}

function replayFromHistory(record: PensukePracticeRecord) {
  loadScramble(record.scramble)
  frAxis.value = record.frAxis
  frAxisMode.value = record.axisMode
  userSolution.value = record.userSolution
  verifyResult.value = verifyLsSolutionSync(record.scramble, record.userSolution, record.frAxis)
  submitted.value = true
}

defineExpose({ replayFromHistory })
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-wrap gap-2">
      <button
        type="button"
        class="px-3 py-1 border border-gray-300 text-sm hover:border-indigo-300"
        @click="handleRandom"
      >
        {{ $t('tools.pensukeTrainer.btn.random') }}
      </button>
    </div>

    <div v-if="!parseOk" class="p-3 border border-red-400 text-red-600 text-sm">
      {{ $t('tools.pensukeTrainer.error.parse', { token: '' }) }}
    </div>

    <div v-if="parseOk && !isHtr" class="p-3 border border-amber-400 text-amber-700 text-sm">
      {{ $t('tools.pensukeTrainer.error.notHtr') }}
    </div>

    <template v-if="isHtr">
      <div class="bg-white shadow-md p-4 border-l-4 border-indigo-500 space-y-4">
        <div>
          <p class="text-sm font-medium mb-1">
            {{ $t('tools.pensukeTrainer.frAxis') }}
          </p>
          <p class="text-xs text-gray-500 mb-2">
            {{ $t('tools.pensukeTrainer.brAxesHint') }}
          </p>
          <div class="flex flex-wrap gap-2 items-center">
            <button
              v-for="ax in AXIS_TABS"
              :key="`fr-${ax}`"
              type="button"
              class="px-3 py-1 text-sm border"
              :class="frAxis === ax && frAxisMode === 'pick'
                ? 'bg-indigo-500 text-white border-indigo-500'
                : 'border-gray-300'"
              @click="frAxis = ax; frAxisMode = 'pick'"
            >
              {{ AXIS_TAB_LABEL[ax] }}
            </button>
            <button
              type="button"
              class="px-3 py-1 text-sm border border-gray-300"
              @click="frAxis = pickRandomAxis(); frAxisMode = 'random'"
            >
              {{ $t('tools.pensukeTrainer.practice.randomAxis') }}
            </button>
          </div>
        </div>
      </div>

      <div class="mb-2">
        <p class="text-sm font-semibold text-gray-700 mb-1">
          {{ $t('tools.pensukeTrainer.input.scramble.label') }}：
        </p>
        <StickyScramble :scramble="scramble" :sticky="false" />
      </div>

      <div class="grid lg:grid-cols-2 gap-6" :class="{ 'pb-52': showKeyboard && !submitted }">
        <div class="bg-white shadow-md p-4">
          <PensukeCube
            :scramble="scramble"
            :ls-axis="lsAxis"
            :fr-axis="frAxis"
            :preview-moves="!submitted && liveInput?.appliedMoves.length ? liveInput.appliedMoves : null"
          />
        </div>

        <div class="space-y-4">
          <div v-if="!submitted">
            <p class="text-sm font-medium mb-2">
              {{ $t('tools.pensukeTrainer.practice.solutionInput') }}
            </p>
            <div class="flex gap-2">
              <input
                v-model="userSolution"
                autofocus
                class="block w-full font-mono shadow-sm border-gray-300 focus:ring-2 focus:border-indigo-300 focus:ring-indigo-200/50 p-2 border text-sm"
                :placeholder="$t('tools.pensukeTrainer.practice.solutionPlaceholder')"
                @keydown="handleKeydown"
              >
              <button
                type="button"
                class="bg-indigo-500 text-white px-3 py-2 shadow-md hover:bg-indigo-600 transition-all duration-200 shrink-0"
                :class="{ 'opacity-50 cursor-not-allowed': !canSubmit }"
                :disabled="!canSubmit"
                @click="handleSubmit"
              >
                <Icon name="material-symbols:send" />
              </button>
            </div>
            <div class="mt-0.5 text-xs flex items-center justify-between">
              <span>
                <span v-if="liveInput?.status === 'ls'" class="text-green-600 font-semibold">
                  {{ $t('tools.pensukeTrainer.practice.liveLs') }} · {{ $t('common.moves', { moves: solutionMoveCount }) }}
                </span>
                <span v-else-if="liveInput?.status === 'invalid' && liveInput.invalidToken" class="text-red-500">
                  {{ $t('tools.pensukeTrainer.practice.liveInvalid', { token: liveInput.invalidToken }) }}
                </span>
              </span>
              <button
                type="button"
                class="px-1.5 py-0.5 transition-all duration-200"
                :class="showKeyboard ? 'bg-indigo-500 text-white' : 'bg-gray-200 text-gray-500 hover:bg-gray-300'"
                @click="showKeyboard = !showKeyboard"
              >
                <Icon name="mdi:keyboard" />
              </button>
            </div>
            <CubeSolutionKeyboard
              v-if="showKeyboard"
              :can-submit="canSubmit"
              :submit-label="$t('tools.pensukeTrainer.practice.submit')"
              @append="appendMove"
              @delete-last="deleteLastMove"
              @clear="clearSolution"
              @submit="handleSubmit"
            />
          </div>

          <div v-else-if="verifyResult" class="space-y-3">
            <div
              class="p-3 border text-sm"
              :class="verifyResult.ok && verifyResult.correct
                ? 'border-green-400 text-green-700 bg-green-50'
                : 'border-red-400 text-red-600 bg-red-50'"
            >
              <template v-if="!verifyResult.ok">
                {{ $t('tools.pensukeTrainer.error.parse', { token: verifyResult.errorToken ?? '' }) }}
              </template>
              <template v-else-if="verifyResult.correct">
                {{ $t('tools.pensukeTrainer.practice.resultCorrect') }}
              </template>
              <template v-else>
                {{ $t('tools.pensukeTrainer.practice.resultWrong') }}
              </template>
            </div>

            <div v-if="referenceSolution">
              <p class="text-sm text-gray-600 mb-1">
                {{ $t('tools.pensukeTrainer.referenceSolution') }}：
              </p>
              <p class="font-mono font-semibold">
                {{ referenceSolution.join(' ') || $t('tools.pensukeTrainer.alreadyLs') }}
              </p>
            </div>

            <button
              type="button"
              class="mt-3 px-3 py-1 border border-indigo-300 text-indigo-600 text-sm"
              @click="handleRandom"
            >
              {{ $t('tools.pensukeTrainer.practice.next') }}
            </button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
