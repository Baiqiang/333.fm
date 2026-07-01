<script setup lang="ts">
import type { FrEmphasis } from '~/utils/cube'

import { buildCubeState } from '~/utils/fr/display'
import type { AxisKey } from '~/utils/fr/types'

/**
 * FR cube display wrapper (shared by analyze, practice, tutorial, etc.).
 *
 * isStatic defaults to false: most pages have one cube and use live WebGL.
 * Only tutorial-case-card passes is-static, because the tutorial page renders many cubes.
 */
const props = withDefaults(defineProps<{
  scramble: string
  axisKey: AxisKey
  solution?: string[] | null
  previewMoves?: string[] | null
  emphasis?: FrEmphasis
  fullCube?: boolean
  keyboardControls?: boolean
  /** Forwarded to Cube3d; set true for multi-cube pages (tutorial). */
  isStatic?: boolean
  /** When false, middle-layer edges are not dimmed (full FR / leave-slice off). */
  leaveSlice?: boolean
  /** Sizing classes forwarded to Cube3d root (default fits single-cube pages). */
  cubeClass?: string
}>(), {
  emphasis: 'axis',
  fullCube: false,
  isStatic: false,
  leaveSlice: true,
  cubeClass: 'w-full max-w-xs mx-auto',
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
      :is-static="isStatic"
      :leave-slice="leaveSlice"
      :class="cubeClass"
    />
    <template #fallback>
      <div :class="[cubeClass, 'aspect-square']" />
    </template>
  </ClientOnly>
</template>
