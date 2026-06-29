<script setup lang="ts">
import type { FrEmphasis } from '~/utils/cube'

import { buildCubeMoves } from '~/utils/fr/display'
import type { AxisKey } from '~/utils/fr/types'

const props = withDefaults(defineProps<{
  scramble: string
  axisKey: AxisKey
  solution?: string[] | null
  previewMoves?: string[] | null
  emphasis?: FrEmphasis
  keyboardControls?: boolean
}>(), {
  emphasis: 'axis',
})

const moves = computed(() => buildCubeMoves(
  props.scramble,
  props.axisKey,
  props.previewMoves,
  props.solution,
))
</script>

<template>
  <ClientOnly>
    <Cube3d
      :moves="moves"
      filter="fr"
      :fr-axis="axisKey"
      :fr-emphasis="emphasis"
      :keyboard-controls="keyboardControls"
      class="w-full max-w-xs mx-auto"
    />
  </ClientOnly>
</template>
