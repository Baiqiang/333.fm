<script setup lang="ts">
withDefaults(defineProps<{
  scramble: string
  sticky?: boolean
  cubieCube?: {
    corners: number[]
    edges: number[]
    placement: number
  }
  /** Follow the scramble image preference instead of always showing the cube. */
  optionalCube?: boolean
  /** The competition has ended or the user has submitted to this scramble. */
  finished?: boolean
}>(), {
  sticky: true,
  optionalCube: false,
  finished: false,
})
</script>

<template>
  <StickyScramble :scramble="scramble" :sticky="sticky" />
  <ScrambleCube v-if="optionalCube" :moves="scramble" :cubie-cube="cubieCube" :finished="finished" />
  <CubeExpanded v-else :moves="scramble" :cubie-cube="cubieCube" />
</template>
