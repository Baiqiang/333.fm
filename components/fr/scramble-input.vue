<script setup lang="ts">
defineProps<{
  scramble: string
  solution: string
}>()

const emit = defineEmits<{
  'update:scramble': [value: string]
  'update:solution': [value: string]
  'analyze': []
  'random': []
  'help': []
}>()

function onKeydown(e: KeyboardEvent) {
  if (e.metaKey || e.ctrlKey)
    if (e.key === 'Enter')
      emit('analyze')
}
</script>

<template>
  <div class="space-y-3">
    <label class="block space-y-1">
      <span class="text-sm font-medium text-gray-700">
        {{ $t('tools.frTrainer.input.scramble.label') }}
      </span>
      <input
        :value="scramble"
        type="text"
        class="w-full font-mono border border-gray-300 rounded p-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        :placeholder="$t('tools.frTrainer.input.scramble.placeholder')"
        @input="emit('update:scramble', ($event.target as HTMLInputElement).value)"
        @keydown="onKeydown"
      >
    </label>
    <label class="block space-y-1">
      <span class="text-sm font-medium text-gray-700">
        {{ $t('tools.frTrainer.input.solution.label') }}
      </span>
      <textarea
        :value="solution"
        rows="4"
        class="w-full font-mono border border-gray-300 rounded p-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        :placeholder="$t('tools.frTrainer.input.solution.placeholder')"
        @input="emit('update:solution', ($event.target as HTMLTextAreaElement).value)"
        @keydown="onKeydown"
      />
    </label>
    <div class="flex flex-wrap gap-2">
      <ButtonPrimary type="button" @click="emit('analyze')">
        {{ $t('tools.frTrainer.btn.analyze') }}
      </ButtonPrimary>
      <button
        type="button"
        class="px-3 py-1 border border-gray-300 rounded text-sm hover:border-indigo-300"
        @click="emit('random')"
      >
        {{ $t('tools.frTrainer.btn.random') }}
      </button>
      <button
        type="button"
        class="ml-auto px-3 py-1 border border-gray-300 rounded text-sm hover:border-indigo-300"
        @click="emit('help')"
      >
        {{ $t('tools.frTrainer.btn.help') }}
      </button>
    </div>
  </div>
</template>
