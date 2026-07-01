<script setup lang="ts">
import type { TutorialCaseItem } from '~/utils/fr/case-data'
import { TUTORIAL_CUBE_CLASS } from '~/utils/fr/tutorial-cube'

defineProps<{
  item: TutorialCaseItem
}>()

const { tutorialCase } = useFrTrainerTutorialText()
</script>

<template>
  <div class="border rounded p-3 flex flex-col sm:flex-row gap-3">
    <!-- Tutorial case list: many cubes per page; static mode avoids WebGL context limit -->
    <FrCube
      :scramble="item.setup"
      axis-key="ud"
      emphasis="axis"
      is-static
      :cube-class="TUTORIAL_CUBE_CLASS"
      class="mx-auto sm:mx-0"
    />
    <div class="flex-1 min-w-0">
      <div class="flex items-center gap-2 mb-1">
        <span class="inline-block px-2 py-0.5 text-xs bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 rounded font-medium">
          {{ item.label }}
        </span>
        <span class="font-mono text-sm font-semibold text-indigo-600 dark:text-indigo-400">{{ item.alg }}</span>
      </div>
      <p class="text-sm text-gray-600 dark:text-gray-400">
        {{ tutorialCase(item.label) }}
      </p>
    </div>
  </div>
</template>
