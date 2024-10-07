<script setup lang="ts">
const props = withDefaults(defineProps<{
  show: boolean
  spoiled: string
}>(), {
  show: false,
})

const showSpoiler = ref(props.show)
</script>

<template>
  <div class="relative">
    <div
      v-if="!showSpoiler"
      class="absolute inset-0 z-50 bg-indigo-500 text-white flex flex-col items-center justify-center cursor-pointer"
      @click="showSpoiler = true"
    >
      <I18nT keypath="common.spoiler" tag="div" scope="global" class="flex items-center">
        <template #for>
          <span class="text-lg font-bold">
            {{ spoiled }}
          </span>
        </template>
      </I18nT>
    </div>
    <slot />
  </div>
</template>
