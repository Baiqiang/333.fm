<script setup lang="ts">
defineProps<{
  scramble: string
  cubieCube?: {
    corners: number[]
    edges: number[]
    placement: number
  }
}>()
</script>

<template>
  <StickyScramble :scramble="scramble" />
  <CubeExpanded :moves="scramble" :cubie-cube="cubieCube" />
</template>
