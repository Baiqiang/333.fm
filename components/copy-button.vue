<script setup lang="ts">
const props = defineProps<{
  source: string
}>()
const { copy, copied } = useClipboard()
const everCopied = ref(false)
function doCopy() {
  copy(props.source)
  everCopied.value = true
}
</script>

<template>
  <div
    class="transition-colors duration-300"
    :class="{
      'text-gray-400': copied,
      'text-indigo-500': !copied && !everCopied,
      'text-orange-500': !copied && everCopied,
    }"
  >
    <Icon
      name="ion:ios-copy"
      class="cursor-pointer"
      @click.stop.prevent="doCopy"
    />
  </div>
</template>
