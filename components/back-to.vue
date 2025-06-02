<script setup lang="ts">
defineProps<{
  to: string
  label: string
}>()
</script>

<template>
  <NuxtLink :to="to" class="text-xs text-blue-500 float-right flex items-center">
    <Icon name="heroicons:chevron-double-left-16-solid" />{{ $t('common.backTo', { to: label }) }}
  </NuxtLink>
</template>
