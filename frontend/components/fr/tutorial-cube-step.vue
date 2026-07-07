<script setup lang="ts">
import type { FrEmphasis } from '~/utils/cube'

import { buildCubeMoves } from '~/utils/fr/display'
import { TUTORIAL_CUBE_CLASS } from '~/utils/fr/tutorial-cube'

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
    <p class="text-sm text-gray-600 dark:text-gray-400 mb-2">
      {{ body }}
    </p>
    <div class="flex flex-col sm:flex-row gap-3 items-center">
      <ClientOnly>
        <!--
          Tutorial renders dozens of cubes on one page; is-static is required to avoid
          exhausting WebGL contexts. Analyze/practice use single-cube pages, not this component.
        -->
        <Cube3d
          :moves="moves"
          filter="fr"
          fr-axis="ud"
          :fr-emphasis="emphasis ?? 'axis'"
          is-static
          :class="TUTORIAL_CUBE_CLASS"
        />
        <template #fallback>
          <div class="aspect-square" :class="[TUTORIAL_CUBE_CLASS]" />
        </template>
      </ClientOnly>
      <p v-if="algLabel" class="font-mono text-sm font-semibold text-indigo-600 dark:text-indigo-400">
        {{ algLabel }}
      </p>
    </div>
  </div>
</template>
