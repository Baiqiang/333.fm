<script setup lang="ts">
import type { AxisKey, LsSolution, PreviewStep } from '~/utils/pensuke/types'

const props = defineProps<{
  solution: LsSolution
  frAxis: AxisKey
  previewStep?: PreviewStep | null
}>()

const emit = defineEmits<{
  'update:previewStep': [value: PreviewStep | null]
}>()

const BR_DISPLAY_LABELS: Record<AxisKey, [string, string]> = {
  ud: ['F/B', 'R/L'],
  fb: ['U/D', 'R/L'],
  rl: ['F/B', 'U/D'],
}

const brLabels = computed((): [string, string] =>
  BR_DISPLAY_LABELS[props.frAxis]!,
)

const DEPTH_STYLE: Record<string, string> = {
  0: 'bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700 text-green-800 dark:text-green-300',
  1: 'bg-lime-100 dark:bg-lime-900/30 border-lime-300 dark:border-lime-700 text-lime-800 dark:text-lime-300',
  2: 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-300 dark:border-yellow-700 text-yellow-800 dark:text-yellow-300',
  3: 'bg-orange-100 dark:bg-orange-900/30 border-orange-300 dark:border-orange-700 text-orange-800 dark:text-orange-300',
  4: 'bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700 text-red-800 dark:text-red-300',
}

const INACTIVE_STYLE = 'bg-gray-100 dark:bg-gray-800/40 border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500'

function depthClass(label: string): string {
  return DEPTH_STYLE[label.slice(-1)] ?? DEPTH_STYLE['4']!
}

function brTrackClass(stepIndex: number, trackIndex: number, label: string): string {
  if (stepIndex === 0)
    return depthClass(label)

  const prev = props.solution.steps[stepIndex - 1]!
  const step = props.solution.steps[stepIndex]!
  const changed = step.brTracks[trackIndex] !== prev.brTracks[trackIndex]

  if (changed)
    return depthClass(label)

  return INACTIVE_STYLE
}

function isFinalStep(index: number): boolean {
  return index === props.solution.steps.length - 1
}
</script>

<template>
  <div class="space-y-2">
    <div class="flex items-center gap-3 mb-1 text-xs text-gray-500">
      <span class="w-6" />
      <span class="w-[3.25rem]" />
      <span class="flex flex-wrap gap-2">
        <span class="font-semibold">BR ({{ brLabels[0] }})</span>
        <span class="font-semibold">BR ({{ brLabels[1] }})</span>
      </span>
    </div>

    <div
      v-for="(step, index) in solution.steps"
      :key="index"
      class="flex gap-3 items-center"
    >
      <span
        class="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
        :class="isFinalStep(index) ? 'bg-green-500 text-white' : 'bg-indigo-500 text-white'"
      >
        {{ index }}
      </span>
      <button
        type="button"
        class="flex-1 border rounded-md px-3 py-2 text-sm text-left transition-colors cursor-pointer"
        :class="previewStep?.index === index
          ? 'ring-2 ring-indigo-500 border-indigo-400'
          : isFinalStep(index)
            ? 'border-green-400 bg-green-50 dark:bg-green-950/30'
            : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 hover:border-indigo-300'"
        @click="emit('update:previewStep', { index })"
      >
        <div class="flex flex-wrap items-center gap-2">
          <span
            class="font-mono font-bold inline-flex items-center justify-center w-[3.25rem] shrink-0 py-1 text-sm text-center"
            :class="step.move ? 'bg-indigo-500 text-white' : 'border border-gray-300 dark:border-gray-600 text-gray-500'"
          >
            {{ step.move ?? $t('tools.pensukeTrainer.start') }}
          </span>
          <span
            class="px-2 py-0.5 rounded text-xs font-bold border"
            :class="brTrackClass(index, 0, step.brTracks[0])"
          >
            {{ step.brTracks[0] }}
          </span>
          <span
            class="px-2 py-0.5 rounded text-xs font-bold border"
            :class="brTrackClass(index, 1, step.brTracks[1])"
          >
            {{ step.brTracks[1] }}
          </span>
          <span
            v-if="isFinalStep(index)"
            class="text-xs font-semibold text-green-600 dark:text-green-400 ml-auto"
          >
            LS ✓
          </span>
        </div>
      </button>
    </div>
  </div>
</template>
