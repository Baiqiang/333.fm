<script setup lang="ts">
import type { FrEmphasis } from '~/utils/cube'
import type { AxisKey } from '~/utils/pensuke/types'

import { buildCubeMoves } from '~/utils/pensuke/display'

const props = withDefaults(defineProps<{
  scramble: string
  lsAxis?: AxisKey
  frAxis?: AxisKey
  previewMoves?: string[] | null
  emphasis?: FrEmphasis
  fullCube?: boolean
  cubeClass?: string
}>(), {
  lsAxis: 'ud',
  frAxis: 'ud',
  emphasis: 'axis',
  fullCube: false,
  cubeClass: 'w-full max-w-xs mx-auto',
})

const frMoves = computed(() =>
  buildCubeMoves(props.scramble, props.lsAxis, props.previewMoves),
)
</script>

<template>
  <ClientOnly>
    <Cube3d
      :moves="frMoves"
      :filter="fullCube ? undefined : 'fr'"
      :fr-axis="fullCube ? undefined : frAxis"
      :fr-emphasis="fullCube ? undefined : emphasis"
      keyboard-controls
      :class="cubeClass"
    />
    <template #fallback>
      <div class="aspect-square" :class="[cubeClass]" />
    </template>
  </ClientOnly>
</template>
