<script setup lang="ts">
defineProps<{
  cancel?: () => void
}>()
</script>

<template>
  <TransitionFade>
    <div class="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50" @click="cancel">
      <div class="bg-white p-5" @click.stop>
        <slot />
      </div>
    </div>
  </TransitionFade>
</template>
