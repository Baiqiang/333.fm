<script setup lang="ts">
defineProps<{
  title: string
  icon: string
  to?: string
}>()
</script>

<template>
  <section class="bg-white shadow-md flex flex-col">
    <header class="flex items-center justify-between gap-2 px-4 py-3 border-b border-gray-200">
      <h2 class="text-lg font-bold">
        <NuxtLink v-if="to" :to="to" class="flex items-center gap-2 hover:text-indigo-500">
          <Icon :name="icon" class="text-indigo-500" />
          {{ title }}
        </NuxtLink>
        <span v-else class="flex items-center gap-2">
          <Icon :name="icon" class="text-indigo-500" />
          {{ title }}
        </span>
      </h2>
      <div class="flex items-center gap-3 text-sm">
        <slot name="actions" />
      </div>
    </header>
    <div class="p-4 flex-1">
      <slot />
    </div>
  </section>
</template>
