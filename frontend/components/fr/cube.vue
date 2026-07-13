<script setup lang="ts">
import type { FrEmphasis } from '~/utils/cube'

import type { AxisKey } from '~/utils/fr/types'
import { buildCubeState } from '~/utils/fr/display'

/**
 * FR cube display wrapper (shared by analyze, practice, tutorial, etc.).
 *
 * css3d: pure 2D canvas renderer for pages with many cubes (tutorial, help).
 * Default WebGL Cube3d is for single-cube interactive pages (analyze, practice).
 */
const props = withDefaults(defineProps<{
  scramble: string
  axisKey: AxisKey
  solution?: string[] | null
  previewMoves?: string[] | null
  emphasis?: FrEmphasis
  fullCube?: boolean
  keyboardControls?: boolean
  /** Use 2D canvas instead of WebGL; required for multi-cube pages. */
  css3d?: boolean
  /** When false, middle-layer edges are not dimmed (full FR / leave-slice off). */
  leaveSlice?: boolean
  /** Sizing classes forwarded to cube root (default fits single-cube pages). */
  cubeClass?: string
}>(), {
  emphasis: 'axis',
  fullCube: false,
  css3d: false,
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
    <CubeCss3d
      v-if="css3d"
      :cubie-cube="cubieCube"
      :filter="fullCube ? undefined : 'fr'"
      :fr-axis="fullCube ? undefined : axisKey"
      :fr-emphasis="fullCube ? undefined : emphasis"
      :leave-slice="leaveSlice"
      :class="cubeClass"
    />
    <Cube3d
      v-else
      :cubie-cube="cubieCube"
      :filter="fullCube ? undefined : 'fr'"
      :fr-axis="fullCube ? undefined : axisKey"
      :fr-emphasis="fullCube ? undefined : emphasis"
      :keyboard-controls="keyboardControls"
      :leave-slice="leaveSlice"
      :class="cubeClass"
    />
    <template #fallback>
      <div class="aspect-square" :class="[cubeClass]" />
    </template>
  </ClientOnly>
</template>
