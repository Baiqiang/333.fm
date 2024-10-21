<script setup lang="ts">
defineProps<{
  attachments: Attachment[]
}>()
</script>

<template>
  <div v-if="attachments && attachments.length > 0" v-viewer class="flex gap-1">
    <img v-for="{ id, url, name } in attachments" :key="id" :src="url" :alt="name" class="w-12 h-12 border border-indigo-500 cursor-pointer">
  </div>
</template>
