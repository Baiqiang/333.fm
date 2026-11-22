<script setup lang="ts">
const { t } = useI18n()
useSeoMeta({
  title: t('settings.title'),
})
</script>

<template>
  <div>
    <Heading1>
      {{ $t('settings.title') }}
    </Heading1>
    <div class="bg-white shadow-md p-4">
      <div class="font-medium">
        {{ $t('settings.scrambleCube') }}
      </div>
      <div class="text-sm text-gray-500 mb-3">
        {{ $t('settings.scrambleCubeDescription') }}
      </div>
      <ScrambleCubeModeOptions />
    </div>
  </div>
</template>
