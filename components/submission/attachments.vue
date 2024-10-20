<script setup lang="ts">
defineProps<{
  attachments: Attachment[]
}>()
</script>

<template>
  <div v-if="attachments && attachments.length > 0" v-viewer class="flex">
    <img v-for="{ id, url, name } in attachments" :key="id" :src="url" :alt="name" class="w-8 h-8 cursor-pointer">
  </div>
</template>
