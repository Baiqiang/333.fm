<script setup lang="ts">
import { MdEditor } from 'md-editor-v3'
import 'md-editor-v3/lib/style.css'

defineProps<{
  placeholder?: string
}>()

const modelValue = defineModel<string>({ default: '' })
</script>

<template>
  <MdEditor
    v-model="modelValue"
    language="en-US"
    :preview="false"
    :placeholder="placeholder"
    :toolbars="['bold', 'italic', 'strikeThrough', '-', 'unorderedList', 'orderedList', '-', 'link', '-', 'preview']"
    :footers="[]"
    :scroll-auto="false"
    class="!border-gray-300 !shadow-sm"
    style="height: auto; min-height: 160px;"
  />
</template>
