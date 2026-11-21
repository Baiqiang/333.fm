<script setup lang="ts">
const { t } = useI18n()
useSeoMeta({
  title: t('settings.title'),
})
const scrambleCube = usePreference('scrambleCube', false)
</script>

<template>
  <div>
    <Heading1>
      {{ $t('settings.title') }}
    </Heading1>
    <div class="bg-white shadow-md p-4 flex items-center justify-between gap-4">
      <div>
        <div class="font-medium">
          {{ $t('settings.scrambleCube') }}
        </div>
        <div class="text-sm text-gray-500">
          {{ $t('settings.scrambleCubeDescription') }}
        </div>
      </div>
      <button
        type="button"
        role="switch"
        :aria-checked="scrambleCube"
        class="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors"
        :class="scrambleCube ? 'bg-indigo-500' : 'bg-gray-300'"
        @click="scrambleCube = !scrambleCube"
      >
        <span
          class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
          :class="scrambleCube ? 'translate-x-6' : 'translate-x-1'"
        />
      </button>
    </div>
  </div>
</template>
