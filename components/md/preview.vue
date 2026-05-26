<script setup lang="ts">
import { MdPreview } from 'md-editor-v3'
import 'md-editor-v3/lib/preview.css'

defineProps<{
  content: string
}>()

const colorMode = useColorMode()
const theme = computed(() => colorMode.value === 'dark' ? 'dark' : 'light')
</script>

<template>
  <MdPreview :model-value="content" :theme="theme" class="!bg-transparent !p-0" />
</template>
