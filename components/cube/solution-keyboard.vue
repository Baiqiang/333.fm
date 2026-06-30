<script setup lang="ts">
const cubeKeys = [
  ['U', 'U\'', 'U2', 'D', 'D\'', 'D2'],
  ['R', 'R\'', 'R2', 'L', 'L\'', 'L2'],
  ['F', 'F\'', 'F2', 'B', 'B\'', 'B2'],
]

withDefaults(defineProps<{
  canSubmit?: boolean
  loading?: boolean
  submitLabel?: string
}>(), {
  canSubmit: false,
  loading: false,
})

const emit = defineEmits<{
  append: [move: string]
  deleteLast: []
  clear: []
  submit: []
}>()

const { t } = useI18n()
</script>

<template>
  <div class="fixed bottom-0 left-0 right-0 z-20 bg-gray-100 border-t border-gray-300 p-2 md:static md:border-0 md:bg-transparent md:p-0 md:mt-2">
    <div class="grid grid-cols-6 gap-1 max-w-lg mx-auto">
      <template v-for="row in cubeKeys" :key="row[0]">
        <button
          v-for="key in row"
          :key="key"
          type="button"
          class="bg-white border border-gray-300 shadow-sm font-mono text-sm font-semibold py-2 active:bg-indigo-100 active:border-indigo-400 hover:bg-gray-50 transition-colors select-none"
          @click="emit('append', key)"
        >
          {{ key }}
        </button>
      </template>
    </div>
    <div class="grid grid-cols-3 gap-1 mt-1 max-w-lg mx-auto">
      <button
        type="button"
        class="bg-gray-200 border border-gray-300 shadow-sm text-sm py-1.5 active:bg-gray-300 hover:bg-gray-100 transition-colors select-none"
        @click="emit('deleteLast')"
      >
        <Icon name="mdi:backspace-outline" class="text-lg" />
      </button>
      <button
        type="button"
        class="bg-gray-200 border border-gray-300 shadow-sm text-sm py-1.5 active:bg-gray-300 hover:bg-gray-100 transition-colors select-none"
        @click="emit('clear')"
      >
        Clear
      </button>
      <button
        type="button"
        class="bg-indigo-500 text-white shadow-sm text-sm py-1.5 active:bg-indigo-700 hover:bg-indigo-600 transition-colors select-none"
        :class="{ 'opacity-50': !canSubmit }"
        :disabled="!canSubmit"
        @click="emit('submit')"
      >
        <Spinner v-if="loading" class="w-4 h-4 text-white border-[3px] inline-block" />
        <template v-else>
          {{ submitLabel ?? t('drTrigger.submit') }}
        </template>
      </button>
    </div>
  </div>
</template>
