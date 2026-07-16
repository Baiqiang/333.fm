<script setup lang="ts">
defineProps<{
  scramble: string
  solution: string
}>()

const emit = defineEmits<{
  'update:scramble': [value: string]
  'update:solution': [value: string]
  'random': []
}>()
</script>

<template>
  <div class="space-y-3">
    <label class="block space-y-1">
      <span class="text-sm font-medium text-gray-700">
        {{ $t('tools.pensukeTrainer.input.scramble.label') }}
      </span>
      <input
        :value="scramble"
        type="text"
        class="w-full font-mono border border-gray-300 p-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        :placeholder="$t('tools.pensukeTrainer.input.scramble.placeholder')"
        @input="emit('update:scramble', ($event.target as HTMLInputElement).value)"
      >
    </label>
    <label class="block space-y-1">
      <span class="text-sm font-medium text-gray-700">
        {{ $t('tools.pensukeTrainer.input.solution.label') }}
      </span>
      <textarea
        :value="solution"
        rows="6"
        class="w-full font-mono border border-gray-300 p-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        :placeholder="$t('tools.pensukeTrainer.input.solution.placeholder')"
        @input="emit('update:solution', ($event.target as HTMLTextAreaElement).value)"
      />
    </label>
    <div class="flex flex-wrap gap-2">
      <button
        type="button"
        class="px-3 py-1 border border-gray-300 text-sm hover:border-indigo-300"
        @click="emit('random')"
      >
        {{ $t('tools.pensukeTrainer.btn.random') }}
      </button>
    </div>
  </div>
</template>
