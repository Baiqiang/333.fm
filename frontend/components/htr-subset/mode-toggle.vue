<script setup lang="ts">
const mode = defineModel<'normal' | 'niss'>({ required: true })
</script>

<template>
  <div class="flex text-xs">
    <button
      v-for="m in (['normal', 'niss'] as const)"
      :key="m"
      class="px-2 py-0.5 border -ml-px first:ml-0 transition-all duration-200"
      :class="mode === m ? 'bg-indigo-500 text-white border-indigo-500 relative' : 'border-gray-300 text-gray-600 hover:bg-gray-50'"
      @click="mode = m"
    >
      {{ $t(`tools.htrSubsetStats.mode.${m}`) }}
    </button>
  </div>
</template>
