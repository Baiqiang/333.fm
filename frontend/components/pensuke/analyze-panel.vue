<script setup lang="ts">
import type { AxisKey, LsSolution, PreviewStep } from '~/utils/pensuke/types'
import { generateHtrScramble } from '~/utils/pensuke'
import { AXIS_TAB_LABEL, AXIS_TABS } from '~/utils/pensuke/display'
import { parsePensukeInput } from '~/utils/pensuke/parse'

const scramble = ref('')
const solution = ref('')
const frAxis = ref<AxisKey>('ud')
const previewStep = ref<PreviewStep | null>(null)
const solutionsCache = ref<Record<AxisKey, LsSolution[]>>({ ud: [], fb: [], rl: [] })
const parseResult = ref<ReturnType<typeof parsePensukeInput> | null>(null)
const searching = ref(false)

const lsAxis = computed(() => frAxis.value)

const localForm = useLocalStorage('tool.pensukeTrainer.analyze', { scramble: '', solution: '' })

watch([scramble, solution], ([s, sol]) => {
  localForm.value = { scramble: s, solution: sol }
})

async function runAnalyze() {
  previewStep.value = null
  solutionsCache.value = { ud: [], fb: [], rl: [] }
  parseResult.value = null

  const parsed = parsePensukeInput(scramble.value, solution.value)
  parseResult.value = parsed
  if (!parsed.ok || !parsed.state)
    return
  if (!parsed.isHtr)
    return

  searching.value = true
  const { solveLeaveSlice } = await import('~/utils/pensuke/solver')
  const cache = { ud: [], fb: [], rl: [] } as Record<AxisKey, LsSolution[]>
  for (const axis of AXIS_TABS)
    cache[axis] = solveLeaveSlice(parsed.state, axis, axis, 14, parsed.scrambleMoves)
  solutionsCache.value = cache
  searching.value = false
}

watchDebounced([scramble, solution], () => {
  if (!scramble.value.trim() && !solution.value.trim()) {
    parseResult.value = null
    solutionsCache.value = { ud: [], fb: [], rl: [] }
    return
  }
  runAnalyze()
}, { debounce: 400 })

watch(frAxis, () => {
  previewStep.value = null
})

function handleRandom() {
  solution.value = generateHtrScramble(16)
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

const activeSolution = computed(() => solutionsCache.value[frAxis.value]?.[0] ?? null)

const previewMoves = computed((): string[] | null => {
  if (!previewStep.value || !activeSolution.value)
    return null
  const { index } = previewStep.value
  if (index <= 0)
    return []
  return activeSolution.value.moves.slice(0, index)
})

const isHtr = computed(() => parseResult.value?.isHtr ?? false)
const parseError = computed(() =>
  parseResult.value && !parseResult.value.ok ? parseResult.value.errorToken : null,
)
const cubeScramble = computed(() => parseResult.value?.scramble ?? scramble.value)
const showCube = computed(() => isHtr.value)
</script>

<template>
  <div class="space-y-6">
    <PensukeScrambleInput
      v-model:scramble="scramble"
      v-model:solution="solution"
      @random="handleRandom"
    />

    <div
      v-if="parseError"
      class="p-3 border border-red-400 text-red-600 text-sm bg-red-50"
    >
      {{ $t('tools.pensukeTrainer.error.parse', { token: parseError }) }}
    </div>

    <div
      v-if="!parseError && scramble.trim() && solution.trim() && !isHtr"
      class="p-3 border border-amber-400 text-amber-700 text-sm bg-amber-50"
    >
      {{ $t('tools.pensukeTrainer.error.notHtr') }}
    </div>

    <div v-if="searching" class="text-sm text-gray-500">
      {{ $t('tools.pensukeTrainer.searching') }}
    </div>

    <template v-if="showCube">
      <div class="bg-white shadow-md p-4 w-full">
        <PensukeCube
          :scramble="cubeScramble"
          :ls-axis="lsAxis"
          :fr-axis="frAxis"
          :preview-moves="previewMoves"
        />
      </div>

      <div class="space-y-2">
        <p class="text-sm font-medium text-gray-700">
          {{ $t('tools.pensukeTrainer.frAxis') }}
        </p>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="ax in AXIS_TABS"
            :key="`fr-${ax}`"
            type="button"
            class="px-3 py-1 text-sm border transition-colors"
            :class="frAxis === ax
              ? 'bg-indigo-500 text-white border-indigo-500'
              : 'border-gray-300 hover:border-indigo-300'"
            @click="frAxis = ax"
          >
            {{ AXIS_TAB_LABEL[ax] }}
          </button>
        </div>
      </div>

      <div v-if="activeSolution" class="flex items-center gap-2">
        <code class="flex-1 font-mono text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md px-3 py-2 break-all">
          {{ activeSolution.moves.join(' ') || $t('tools.pensukeTrainer.alreadyLs') }}
        </code>
        <CopyButton v-if="activeSolution.moves.length" :source="activeSolution.moves.join(' ')" />
      </div>

      <div v-if="activeSolution">
        <PensukeSolutionTimeline
          :solution="activeSolution"
          :fr-axis="frAxis"
          :preview-step="previewStep"
          @update:preview-step="previewStep = $event"
        />
      </div>
      <p v-else-if="!searching" class="text-sm text-gray-500">
        {{ $t('tools.pensukeTrainer.noSolution') }}
      </p>
    </template>
  </div>
</template>
