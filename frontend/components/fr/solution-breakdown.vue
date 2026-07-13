<script setup lang="ts">
import type { PreviewStepTrack, SolutionStep } from '~/utils/fr/types'

const props = defineProps<{
  steps: SolutionStep[]
  shapeSteps?: SolutionStep[] | null
  selectedTrack?: PreviewStepTrack | null
  selectedIndex?: number | null
}>()

const emit = defineEmits<{
  select: [track: PreviewStepTrack, index: number]
  trackChange: [track: PreviewStepTrack]
}>()

const hasShapeBreakdown = computed(() => (props.shapeSteps?.length ?? 0) > 0)
const activeTrack = ref<PreviewStepTrack>('true')

watch(
  () => props.shapeSteps,
  (steps) => {
    activeTrack.value = steps?.length ? 'shape' : 'true'
  },
  { immediate: true },
)

function switchTrack(track: PreviewStepTrack) {
  if (!hasShapeBreakdown.value || activeTrack.value === track)
    return
  activeTrack.value = track
  emit('trackChange', track)
}
</script>

<template>
  <div>
    <div v-if="hasShapeBreakdown" class="flex flex-wrap gap-2 mb-3">
      <button
        type="button"
        class="px-3 py-1 text-xs border transition-colors"
        :class="activeTrack === 'shape'
          ? 'bg-amber-500 text-white border-amber-500'
          : 'border-gray-300 hover:border-amber-300'"
        @click="switchTrack('shape')"
      >
        {{ $t('tools.frTrainer.falseFr') }}
      </button>
      <button
        type="button"
        class="px-3 py-1 text-xs border transition-colors"
        :class="activeTrack === 'true'
          ? 'bg-green-600 text-white border-green-600'
          : 'border-gray-300 hover:border-green-300'"
        @click="switchTrack('true')"
      >
        {{ $t('tools.frTrainer.trueFr') }}
      </button>
    </div>

    <FrSolutionSteps
      v-if="hasShapeBreakdown && activeTrack === 'shape'"
      :steps="shapeSteps!"
      :selected-index="selectedTrack === 'shape' ? selectedIndex : null"
      @select="emit('select', 'shape', $event)"
    />
    <FrSolutionSteps
      v-else
      :steps="steps"
      :selected-index="selectedTrack === 'true' ? selectedIndex : null"
      @select="emit('select', 'true', $event)"
    />
  </div>
</template>
