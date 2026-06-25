<script setup lang="ts">
defineProps<{
  src: string
  name: string
}>()
</script>

<template>
  <img :src="src" :alt="name" class="w-16 h-16 border-2 border-indigo-500 object-cover cursor-pointer">
</template>
