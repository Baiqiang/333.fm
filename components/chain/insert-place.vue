<script setup lang="ts">
const props = defineProps<{
  insertPlace: number
  disabled?: boolean
}>()
const value = defineModel()
function setValue(insertPlace: number) {
  if (props.disabled)
    return
  value.value = insertPlace
}
</script>

<template>
  <button
    class="border border-gray-800 border-dashed w-3 h-3 rounded-full disabled:cursor-default"
    :class="{
      'bg-indigo-500 border-indigo-500': insertPlace === value,
    }"
    :disabled="disabled"
    @click.prevent="setValue(insertPlace)"
  />
</template>
