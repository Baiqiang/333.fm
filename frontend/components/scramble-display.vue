<script setup lang="ts">
withDefaults(defineProps<{
  scramble: string
  sticky?: boolean
  cubieCube?: {
    corners: number[]
    edges: number[]
    placement: number
  }
}>(), {
  sticky: true,
})
</script>

<template>
  <StickyScramble :scramble="scramble" :sticky="sticky" />
  <CubeExpanded :moves="scramble" :cubie-cube="cubieCube" />
</template>
