<script setup lang="ts">
withDefaults(defineProps<{
  scramble: string
  sticky?: boolean
}>(), {
  sticky: true,
})
</script>

<template>
  <Sequence
    :sequence="scramble"
    :source="scramble"
    class="top-0 z-30 text-lg bg-gray-50 font-semibold border-l-2 border-indigo-300 px-2 shadow-md mb-2"
    :class="{ sticky }"
  />
</template>
