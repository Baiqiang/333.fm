<script setup lang="ts">
import type { DsSecondSlice, Slice, SliceGoal } from '@333fm/utils'
import type { PensukeAxisMode, PensukePracticeMode, PensukePracticeRecord } from '~/composables/pensuke-practice-history'
import type { AxisKey } from '~/utils/pensuke/types'
import { drSlice, dsSecondSlices, sliceGoalMaxDistance } from '@333fm/utils'
import { appendPensukePracticeRecord } from '~/composables/pensuke-practice-history'
import {
  parsePensukeInput,
  parsePensukePracticeInput,
  verifySliceSolutionSync,
} from '~/utils/pensuke'
import { AXIS_TAB_LABEL, AXIS_TABS } from '~/utils/pensuke/display'
import { generateSlicePracticeProblem, solveSlicePracticeScramble } from '~/utils/pensuke/practice-generator'

const props = withDefaults(defineProps<{ practiceMode?: PensukePracticeMode }>(), { practiceMode: 'ls' })
const emit = defineEmits<{
  historyChange: []
}>()
const goalLabel = computed(() => props.practiceMode.toUpperCase())
const goalName = computed(() => props.practiceMode === 'ds' ? 'Double Slice' : 'Leave Slice')

const scramble = ref('')
const frAxis = ref<AxisKey>('ud')
const frAxisMode = ref<PensukeAxisMode>('pick')
const userSolution = ref('')
const submitted = ref(false)
const verifyResult = ref<ReturnType<typeof verifySliceSolutionSync> | null>(null)
const showKeyboard = ref(false)
const isHtr = ref(false)
const parseOk = ref(true)
const maxOptimalMoves = ref<number | null>(null)
const loading = ref(true)
const generationError = ref(false)
const referenceSolution = ref<string[] | null>(null)
const referenceTargets = ref<Slice[]>([])
const problemVersion = ref(0)
const secondSlice = ref<DsSecondSlice>('either')
const secondSliceOptions = computed(() => dsSecondSlices(frAxis.value))
const goal = computed<SliceGoal>(() => props.practiceMode === 'ls'
  ? { mode: 'ls', axis: frAxis.value }
  : { mode: 'ds', axis: frAxis.value, secondSlice: secondSlice.value })
const maximumDistance = computed(() => sliceGoalMaxDistance(goal.value))
const distanceOptions = computed(() => Array.from({ length: maximumDistance.value + 1 }, (_, i) => i))
const referenceTargetText = computed(() => referenceTargets.value.map(slice => `${drSlice(frAxis.value)} + ${slice}`).join(' / '))

const lsAxis = computed(() => frAxis.value)

const { appendMove, deleteLastMove, clearSolution, handleSolutionKeydown } = useCubeMoveInput(userSolution)

function pickRandomAxis(): AxisKey {
  return AXIS_TABS[Math.floor(Math.random() * AXIS_TABS.length)]!
}

function loadScramble(s: string) {
  const parsed = parsePensukeInput(s, '')
  parseOk.value = parsed.ok
  isHtr.value = parsed.ok && parsed.isHtr
  scramble.value = s
  userSolution.value = ''
  submitted.value = false
  verifyResult.value = null
  problemVersion.value++
}

function handleRandom() {
  loading.value = true
  generationError.value = false
  isHtr.value = false
  referenceSolution.value = null
  referenceTargets.value = []
  if (props.practiceMode === 'ls' && frAxisMode.value === 'random')
    frAxis.value = pickRandomAxis()
  if (props.practiceMode === 'ds' && secondSlice.value === drSlice(frAxis.value))
    secondSlice.value = 'either'
  if (maxOptimalMoves.value !== null)
    maxOptimalMoves.value = Math.min(maxOptimalMoves.value, maximumDistance.value)
  try {
    const problem = generateSlicePracticeProblem(goal.value, maxOptimalMoves.value ?? maximumDistance.value)
    loadScramble(problem.scramble)
    referenceSolution.value = problem.solution
    referenceTargets.value = problem.dsTargets
  }
  catch {
    generationError.value = true
  }
  finally {
    loading.value = false
  }
}

function selectAxis(axis: AxisKey) {
  frAxisMode.value = 'pick'
  frAxis.value = axis
  handleRandom()
}

function selectRandomAxis() {
  frAxisMode.value = 'random'
  handleRandom()
}

onMounted(handleRandom)

const liveInput = computed(() => {
  if (!isHtr.value || submitted.value)
    return null
  return parsePensukePracticeInput(scramble.value, userSolution.value, goal.value)
})

const canSubmit = computed(() =>
  isHtr.value
  && !loading.value
  && !submitted.value
  && (userSolution.value.trim().length > 0 || referenceSolution.value?.length === 0)
  && liveInput.value?.status !== 'invalid',
)

const solutionMoveCount = computed(() => liveInput.value?.appliedMoves.length ?? 0)

function handleKeydown(e: KeyboardEvent) {
  handleSolutionKeydown(e, canSubmit.value, handleSubmit)
}

function handleSubmit() {
  verifyResult.value = verifySliceSolutionSync(scramble.value, userSolution.value, goal.value)
  submitted.value = true
  appendPensukePracticeRecord({
    scramble: scramble.value,
    lsAxis: frAxis.value,
    frAxis: frAxis.value,
    axisMode: frAxisMode.value,
    practiceMode: props.practiceMode,
    secondSlice: props.practiceMode === 'ds' ? secondSlice.value : undefined,
    maxOptimalMoves: maxOptimalMoves.value,
    userSolution: userSolution.value.trim(),
    correct: verifyResult.value.ok && verifyResult.value.correct,
    userMoveCount: verifyResult.value.userMoves.length,
    referenceMoveCount: referenceSolution.value?.length ?? null,
  })
  emit('historyChange')
}

function replayFromHistory(record: PensukePracticeRecord) {
  if ((record.practiceMode ?? 'ls') !== props.practiceMode)
    return
  loading.value = true
  generationError.value = false
  referenceSolution.value = null
  referenceTargets.value = []
  loadScramble(record.scramble)
  frAxis.value = record.frAxis
  frAxisMode.value = props.practiceMode === 'ds' ? 'pick' : record.axisMode
  secondSlice.value = record.secondSlice ?? 'either'
  maxOptimalMoves.value = record.maxOptimalMoves ?? null
  userSolution.value = record.userSolution
  verifyResult.value = verifySliceSolutionSync(record.scramble, record.userSolution, goal.value)
  submitted.value = true
  try {
    const problem = solveSlicePracticeScramble(record.scramble, goal.value)
    referenceSolution.value = problem.solution
    referenceTargets.value = problem.dsTargets
  }
  catch {
    generationError.value = true
  }
  finally {
    loading.value = false
  }
}

defineExpose({ replayFromHistory })
</script>

<template>
  <div class="space-y-6" :aria-busy="loading">
    <div class="flex flex-wrap gap-2">
      <button
        type="button"
        class="px-3 py-1 border border-gray-300 text-sm hover:border-indigo-300"
        :disabled="loading"
        @click="handleRandom"
      >
        {{ $t('tools.pensukeTrainer.btn.random') }}
      </button>
    </div>

    <div class="bg-white shadow-md p-4 border-l-4 border-indigo-500 space-y-4">
      <div>
        <p class="text-sm font-medium mb-1">
          {{ $t('tools.pensukeTrainer.practice.drAxis') }}
        </p>
        <p class="text-xs text-gray-500 mb-2">
          {{ $t('tools.pensukeTrainer.practice.drSliceHint', { slice: drSlice(frAxis) }) }}
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
            :disabled="loading"
            @click="selectAxis(ax)"
          >
            {{ AXIS_TAB_LABEL[ax] }}
          </button>
          <button
            v-if="practiceMode === 'ls'"
            type="button"
            class="px-3 py-1 text-sm border"
            :class="frAxisMode === 'random' ? 'bg-indigo-500 text-white border-indigo-500' : 'border-gray-300'"
            :disabled="loading"
            @click="selectRandomAxis"
          >
            {{ $t('tools.pensukeTrainer.practice.randomAxis') }}
          </button>
        </div>
      </div>
      <div v-if="practiceMode === 'ds'">
        <label for="pensuke-ds-second-slice" class="text-sm font-medium block mb-1">
          {{ $t('tools.pensukeTrainer.practice.secondSlice') }}
        </label>
        <select
          id="pensuke-ds-second-slice"
          v-model="secondSlice"
          class="block w-full max-w-xs shadow-sm border-gray-300 focus:ring-2 focus:border-indigo-300 focus:ring-indigo-200/50 p-2 border text-sm"
          :disabled="loading"
          @change="handleRandom"
        >
          <option v-for="slice in secondSliceOptions" :key="slice" :value="slice">
            {{ slice }}
          </option>
          <option value="either">
            {{ $t('tools.pensukeTrainer.practice.eitherSlice') }}
          </option>
        </select>
        <p class="text-xs text-gray-500 mt-1">
          {{ $t('tools.pensukeTrainer.practice.dsGoalHint') }}
        </p>
        <p v-if="secondSlice === 'either'" class="text-xs text-gray-500 mt-1">
          {{ $t('tools.pensukeTrainer.practice.eitherHint') }}
        </p>
      </div>
      <div>
        <label :for="`pensuke-${practiceMode}-distance`" class="text-sm font-medium block mb-1">
          {{ $t('tools.pensukeTrainer.practice.maxOptimalMoves', { goal: goalLabel }) }}
        </label>
        <select
          :id="`pensuke-${practiceMode}-distance`"
          v-model="maxOptimalMoves"
          class="block w-full max-w-xs shadow-sm border-gray-300 focus:ring-2 focus:border-indigo-300 focus:ring-indigo-200/50 p-2 border text-sm"
          :disabled="loading"
          @change="handleRandom"
        >
          <option :value="null">
            {{ $t('tools.pensukeTrainer.practice.unlimited') }}
          </option>
          <option v-for="n in distanceOptions" :key="n" :value="n">
            ≤ {{ n }}
          </option>
        </select>
        <p class="text-xs text-gray-500 mt-1">
          {{ $t('tools.pensukeTrainer.practice.distanceHint', { goal: goalLabel }) }}
        </p>
      </div>
    </div>

    <p v-if="loading" role="status" class="text-sm text-gray-500">
      {{ $t('tools.pensukeTrainer.practice.generating') }}
    </p>
    <p v-if="generationError" role="alert" class="p-3 border border-red-400 text-red-600 text-sm">
      {{ $t('tools.pensukeTrainer.practice.generationError') }}
    </p>
    <div v-if="!loading && !generationError && !parseOk" class="p-3 border border-red-400 text-red-600 text-sm">
      {{ $t('tools.pensukeTrainer.error.parse', { token: '' }) }}
    </div>
    <div v-if="!loading && !generationError && parseOk && !isHtr" class="p-3 border border-amber-400 text-amber-700 text-sm">
      {{ $t('tools.pensukeTrainer.error.notHtr') }}
    </div>

    <template v-if="isHtr">
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
              {{ $t('tools.pensukeTrainer.practice.solutionInput', { goal: goalLabel }) }}
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
                <span v-if="liveInput?.status === 'reached'" class="text-green-600 font-semibold">
                  {{ $t('tools.pensukeTrainer.practice.liveReached', { goal: goalName }) }} · {{ $t('common.moves', { moves: solutionMoveCount }) }}
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
            <Spoiler
              v-if="referenceSolution"
              :key="problemVersion"
              class="mt-4"
              :spoiled="$t('tools.pensukeTrainer.referenceSolution')"
            >
              <template #label>
                {{ $t('tools.pensukeTrainer.practice.revealReference') }}
              </template>
              <div class="border border-indigo-300 p-4">
                <p class="text-sm text-gray-600 mb-1">
                  {{ $t('tools.pensukeTrainer.referenceSolution') }}：
                </p>
                <p class="font-mono font-semibold">
                  {{ referenceSolution.join(' ') || $t('tools.pensukeTrainer.practice.alreadyGoal', { goal: goalName }) }}
                </p>
                <p v-if="referenceTargets.length" class="text-xs text-gray-500 mt-1">
                  {{ $t('tools.pensukeTrainer.practice.referenceTargets', { slices: referenceTargetText }) }}
                </p>
              </div>
            </Spoiler>
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
                {{ $t('tools.pensukeTrainer.practice.resultCorrect', { goal: goalName }) }}
              </template>
              <template v-else>
                {{ $t('tools.pensukeTrainer.practice.resultWrong', { goal: goalName }) }}
              </template>
            </div>

            <div v-if="referenceSolution">
              <p class="text-sm text-gray-600 mb-1">
                {{ $t('tools.pensukeTrainer.referenceSolution') }}：
              </p>
              <p class="font-mono font-semibold">
                {{ referenceSolution.join(' ') || $t('tools.pensukeTrainer.practice.alreadyGoal', { goal: goalName }) }}
              </p>
              <p v-if="referenceTargets.length" class="text-xs text-gray-500 mt-1">
                {{ $t('tools.pensukeTrainer.practice.referenceTargets', { slices: referenceTargetText }) }}
              </p>
            </div>

            <button
              type="button"
              class="mt-3 px-3 py-1 border border-indigo-300 text-indigo-600 text-sm"
              :disabled="loading"
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
