<script setup lang="ts">
defineProps<{
  single: string | null
  average: string | null
}>()

function badgeClass(rec: string) {
  if (rec === 'WR')
    return 'bg-red-500'
  if (rec === 'NR')
    return 'bg-green-500'
  return 'bg-yellow-500'
}
</script>

<template>
  <span
    v-if="single"
    class="text-xs font-bold px-1.5 py-0.5 rounded text-white leading-none"
    :class="badgeClass(single)"
  >
    {{ single }}
  </span>
  <span
    v-if="average"
    class="text-xs font-bold px-1.5 py-0.5 rounded text-white leading-none"
    :class="badgeClass(average)"
  >
    {{ average }} Mean
  </span>
</template>
