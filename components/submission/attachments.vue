<script setup lang="ts">
defineProps<{
  attachments: Attachment[]
}>()
</script>

<template>
  <div v-if="attachments && attachments.length > 0" v-viewer class="flex gap-1">
    <SubmissionImg v-for="{ id, url, name } in attachments" :key="id" :src="url" :name="name" />
  </div>
</template>
