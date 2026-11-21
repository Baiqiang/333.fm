<script setup lang="ts">
const props = withDefaults(defineProps<{
  scramble: string
  sticky?: boolean
  cubieCube?: {
    corners: number[]
    edges: number[]
    placement: number
  }
  /** Follow the scramble image preference instead of always showing the cube. */
  optionalCube?: boolean
}>(), {
  sticky: true,
  optionalCube: false,
})
const preferCube = usePreference('scrambleCube', false)
const showCube = computed(() => !props.optionalCube || preferCube.value)
</script>

<template>
  <StickyScramble :scramble="scramble" :sticky="sticky" />
  <CubeExpanded v-if="showCube" :moves="scramble" :cubie-cube="cubieCube" />
  <button
    v-else
    class="my-2 flex items-center gap-1 text-sm text-blue-500 hover:text-blue-600"
    @click="preferCube = true"
  >
    <Icon name="mdi:cube-unfolded" />
    {{ $t('home.showCube') }}
  </button>
</template>
