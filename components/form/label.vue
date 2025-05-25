<script setup lang="ts">
withDefaults(defineProps<{
  label?: string
}>(), {
  label: '',
})
</script>

<template>
  <div class="grid grid-cols-subgrid col-span-full">
    <span class="font-bold">
      {{ label }}
    </span>
    <div class="">
      <slot />
    </div>
  </div>
</template>
