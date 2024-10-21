<script setup lang="ts">
const props = defineProps<{
  attachments: Attachment[]
  show?: boolean
}>()
const emit = defineEmits<{
  hide: []
}>()
const viewerRef = ref<any>()
watch(() => props.show, (show) => {
  if (show) {
    const viewer = viewerRef.value?.$viewer as Viewer
    if (viewer) {
      viewer.show()
    }
  }
})
onMounted(() => {
  viewerRef.value?.addEventListener('hide', () => {
    emit('hide')
  })
})
</script>

<template>
  <div v-if="attachments && attachments.length > 0" ref="viewerRef" v-viewer class="flex gap-1">
    <SubmissionImg v-for="{ id, url, name } in attachments" :key="id" :src="url" :name="name" />
  </div>
</template>
