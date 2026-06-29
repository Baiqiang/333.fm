<script setup lang="ts">
defineProps<{
  modelValue: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'analyze': []
  'random': []
  'help': []
}>()
</script>

<template>
  <div class="space-y-3">
    <textarea
      :value="modelValue"
      class="w-full font-mono border border-gray-300 rounded p-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
      :placeholder="$t('tools.frTrainer.input.placeholder')"
      rows="3"
      @input="emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
      @keydown.meta.enter="emit('analyze')"
      @keydown.ctrl.enter="emit('analyze')"
    />
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
