<script setup lang="ts">
withDefaults(defineProps<{
  label?: string
}>(), {
  label: '',
})
</script>

<template>
  <div class="grid grid-cols-1 gap-2 md:grid-cols-12">
    <span class="md:col-span-2 lg:col-span-1 font-bold md:py-3">
      {{ label }}
    </span>
    <div class="md:col-span-10">
      <slot />
    </div>
  </div>
</template>
