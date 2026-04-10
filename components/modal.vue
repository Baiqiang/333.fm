<script setup lang="ts">
defineProps<{
  cancel?: () => void
}>()
</script>

<template>
  <TransitionFade>
    <div class="fixed inset-0 flex items-center justify-center bg-black/50 z-50" @click="cancel">
      <div class="bg-white dark:bg-gray-800 dark:text-gray-200 p-5 max-w-md" @click.stop>
        <slot />
      </div>
    </div>
  </TransitionFade>
</template>
