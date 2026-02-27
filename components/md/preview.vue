<script setup lang="ts">
import { MdPreview } from 'md-editor-v3'
import 'md-editor-v3/lib/preview.css'

defineProps<{
  content: string
}>()
</script>

<template>
  <MdPreview :model-value="content" class="!bg-transparent !p-0" />
</template>
