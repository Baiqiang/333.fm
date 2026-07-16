<script setup lang="ts">
import type { BrCaseItem } from '~/utils/pensuke/case-data'

defineProps<{
  item: BrCaseItem
  body: string
}>()
</script>

<template>
  <div class="border p-3 flex flex-col gap-2">
    <div class="mx-auto shrink-0">
      <ClientOnly>
        <CubeCss3d
          :moves="item.scramble"
          filter="pensuke-br"
          :ls-axis="item.lsAxis"
          :br-face-pair="item.brFacePair"
          class="w-60 h-60"
        />
        <template #fallback>
          <div class="w-60 h-60" />
        </template>
      </ClientOnly>
    </div>
    <div class="w-full">
      <span class="inline-block px-1.5 py-0.5 text-xs font-medium bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 mb-1">{{ item.label }}</span>
      <p class="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
        {{ body }}
      </p>
    </div>
  </div>
</template>
