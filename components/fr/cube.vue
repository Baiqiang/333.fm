<script setup lang="ts">
import type { FrEmphasis } from '~/utils/cube'

import { buildCubeState } from '~/utils/fr/display'
import type { AxisKey } from '~/utils/fr/types'

const props = withDefaults(defineProps<{
  scramble: string
  axisKey: AxisKey
  solution?: string[] | null
  previewMoves?: string[] | null
  emphasis?: FrEmphasis
  fullCube?: boolean
  keyboardControls?: boolean
}>(), {
  emphasis: 'axis',
  fullCube: false,
})

const cubieCube = computed(() => buildCubeState(
  props.scramble,
  props.axisKey,
  props.previewMoves,
  props.solution,
))
</script>

<template>
  <ClientOnly>
    <Cube3d
      :cubie-cube="cubieCube"
      :filter="fullCube ? undefined : 'fr'"
      :fr-axis="fullCube ? undefined : axisKey"
      :fr-emphasis="fullCube ? undefined : emphasis"
      :keyboard-controls="keyboardControls"
      class="w-full max-w-xs mx-auto"
    />
  </ClientOnly>
</template>
