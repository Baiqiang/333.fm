<script setup lang="ts">
const { t } = useI18n()
useSeoMeta({
  title: t('endless.title'),
})
</script>

<template>
  <div>
    <Heading1>
      {{ $t('endless.title') }}
    </Heading1>
    <EndlessList />
  </div>
</template>
