<script setup lang="ts">
const { t } = useI18n()
useSeoMeta({
  title: t('endless.title'),
})
</script>

<template>
  <div>
    <h1 class="font-bold text-lg md:text-3xl my-2">
      {{ $t('endless.title') }}
    </h1>
    <EndlessList />
  </div>
</template>
