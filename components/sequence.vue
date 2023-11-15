<script setup lang="ts">
defineProps<{
  sequence: string
  html?: boolean
  prefix?: string
  source?: string
}>()
const { copy, copied } = useClipboard()
</script>

<template>
  <div class="flex items-start gap-1">
    <pre v-if="!html" class="sequence"><span v-if="prefix" class="select-none">{{ prefix }}</span>{{ sequence }}</pre>
    <pre v-else class="sequence" v-html="sequence" />
    <div v-if="source" class="w-10 flex flex-col md:flex-row items-center justify-center md:items-start md:justify-start pt-1">
      <div v-if="copied" class="text-xs text-gray-500">
        Copied
      </div>
      <Icon
        v-else
        name="ion:ios-copy"
        class="cursor-pointer text-indigo-500"
        @click="copy(source)"
      />
    </div>
  </div>
</template>

<style scoped>
.sequence {
  @apply whitespace-pre-wrap;

  overflow-wrap: anywhere;
}
</style>
