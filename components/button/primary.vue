<script setup lang="ts">
defineProps<{
  to: string
  icon?: string
}>()
</script>

<template>
  <NuxtLink :to="to" class="button-primary">
    <slot />
    <Icon v-if="icon" :name="icon" class="ml-2" />
  </NuxtLink>
</template>

<style scoped>
.button-primary {
  @apply inline-block bg-indigo-500 hover:bg-indigo-600 active:bg-indigo-700 text-white px-4 py-2 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 ease-in-out hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-opacity-50;
}
</style>
