<script setup lang="ts">
import type { FrEmphasis } from '~/utils/cube'

import { buildCubeMoves } from '~/utils/fr/display'

const props = defineProps<{
  title?: string
  body: string
  scramble: string
  solution?: string[]
  emphasis?: FrEmphasis
  algLabel?: string
}>()

const moves = computed(() => {
  if (props.solution?.length)
    return buildCubeMoves(props.scramble, 'ud', null, props.solution)
  return props.scramble
})
</script>

<template>
  <div class="border rounded p-3">
    <p v-if="title" class="font-semibold text-sm mb-1">
      {{ title }}
    </p>
    <p class="text-sm text-gray-600 mb-2">
      {{ body }}
    </p>
    <div class="flex flex-col sm:flex-row gap-3 items-center">
      <ClientOnly>
        <Cube3d
          :moves="moves"
          filter="fr"
          fr-axis="ud"
          :fr-emphasis="emphasis ?? 'axis'"
          class="w-28 shrink-0"
        />
      </ClientOnly>
      <p v-if="algLabel" class="font-mono text-sm text-indigo-600">
        {{ algLabel }}
      </p>
    </div>
  </div>
</template>
