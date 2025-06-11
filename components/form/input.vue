<script setup lang="ts">
const props = withDefaults(defineProps<{
  type?: string
  label?: string
  description?: string
  attrs?: Record<string, unknown>
  rows?: number
  options?: { label: string, value: string | number, description?: string, disabled?: boolean }[]
  errorMessage?: string
  state?: boolean | null
}>(), {
  label: '',
  rows: 4,
})
const value = defineModel<string | number>()
const inputClass = computed<string>(() => {
  const className = ['focus:ring-2 focus:ring-opacity-50']
  if (props.type !== 'file')
    className.push('block w-full shadow-sm')
  if (props.state === null)
    className.push('border-gray-300 focus:border-indigo-300 focus:ring-indigo-200')
  else if (props.state === true)
    className.push('border-green-600 focus:border-green-600 focus:ring-green-200')
  else
    className.push('border-red-600 focus:border-red-600 focus:ring-red-200')
  if (props.attrs?.disabled)
    className.push('bg-gray-100 cursor-not-allowed')

  return className.join(' ')
})
</script>

<template>
  <FormLabel :label="label">
    <select v-if="type === 'select'" v-model="value" v-bind="attrs" :class="inputClass">
      <option
        v-for="option in options"
        :key="option.value"
        :value="option.value"
        :disabled="option.disabled"
      >
        {{ option.label }}
      </option>
    </select>
    <div v-else-if="type === 'radio'" class="flex flex-wrap gap-2 md:mt-3 mb-2 px-2">
      <label v-for="option in options" :key="option.value" class="flex items-center gap-2" :class="{ 'cursor-pointer': !option.disabled, 'cursor-not-allowed': option.disabled }">
        <input
          v-bind="attrs"
          v-model="value"
          :type="type"
          :value="option.value"
          :disabled="option.disabled"
        >
        {{ option.label }}
      </label>
      <div class="w-full text-sm text-gray-500">
        {{ options?.find(o => o.value === value)?.description }}
      </div>
    </div>
    <textarea v-else-if="type === 'textarea'" v-model="value" v-bind="attrs" :class="inputClass" :rows="rows" class="font-mono" />
    <input v-else-if="type" v-model="value" v-bind="attrs" :class="inputClass" :type="type" class="font-mono">
    <div v-if="state === false && errorMessage" class="text-red-600 text-sm px-2 py-1" v-html="errorMessage" />
    <slot />
    <div class="text-sm text-gray-500 px-2">
      <slot name="description" />
    </div>
  </FormLabel>
</template>
