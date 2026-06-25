<script setup lang="ts">
defineProps<{
  record: string | null | undefined
}>()
</script>

<template>
  <span
    v-if="record"
    class="text-[10px] font-bold px-1 py-0.5 rounded text-white leading-none align-middle"
    :class="record === 'WR' ? 'bg-red-500' : record === 'NR' ? 'bg-green-500' : 'bg-yellow-500'"
  >
    {{ record }}
  </span>
</template>
