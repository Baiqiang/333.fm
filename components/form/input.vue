import { FormLabel } from '#build/components';
<script setup lang="ts">
const props = withDefaults(defineProps<{
  modelValue?: string | number
  type?: string
  label?: string
  description?: string
  attrs?: Record<string, unknown>
  rows?: number
  options?: { label: string; value: string }[]
  errorMessage?: string
  state?: boolean | null
}>(), {
  label: '',
  rows: 4,
})
const emit = defineEmits(['update:modelValue'])
const value = computed<string | number>({
  get() {
    return props.modelValue!
  },
  set(value: string | number) {
    emit('update:modelValue', value)
  },
})
const inputClass = computed<string>(() => {
  let className = 'block w-full shadow-sm focus:ring-2 focus:ring-opacity-50 '
  if (props.state === null)
    className += 'border-gray-300 focus:border-indigo-300 focus:ring-indigo-200'
  else if (props.state === true)
    className += 'border-green-600 focus:border-green-600 focus:ring-green-200'
  else
    className += 'border-red-600 focus:border-red-600 focus:ring-red-200'
  if (props.attrs?.disabled)
    className += ' bg-gray-100 cursor-not-allowed'

  return className
})
</script>

<template>
  <FormLabel :label="label" class="form-label">
    <select v-if="type === 'select'" v-model="value" v-bind="attrs" :class="inputClass">
      <option
        v-for="option in options"
        :key="option.value"
        :value="option.value"
      >
        {{ option.label }}
      </option>
    </select>
    <textarea v-else-if="type === 'textarea'" v-model="value" v-bind="attrs" :class="inputClass" :rows="rows" />
    <input v-else-if="type" v-model="value" v-bind="attrs" :class="inputClass" :type="type">
    <div v-if="state === false && errorMessage" class="text-red-600 text-sm px-2 py-1" v-html="errorMessage" />
    <slot />
    <div class="text-sm text-gray-500 px-2">
      <slot name="description" />
    </div>
  </FormLabel>
</template>

<style>
.form-label a {
  @apply text-blue-500;
}
</style>
