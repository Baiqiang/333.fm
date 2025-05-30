<script setup lang="ts">
withDefaults(defineProps<{
  value?: number
  isBest?: boolean
  is?: any
  placeholder?: string
  dns?: boolean
}>(), {
  value: 0,
  isBest: false,
  is: 'div',
  placeholder: '',
  dns: false,
})
</script>

<template>
  <component
    :is="is"
    class="font-mono"
    :class="{
      'text-indigo-500 font-bold': isBest,
      'text-red-400': value === DNF,
      'text-orange-400': value === DNS || dns,
    }"
  >
    {{ formatResult(value || (dns ? DNS : 0)) || placeholder }}
  </component>
</template>
