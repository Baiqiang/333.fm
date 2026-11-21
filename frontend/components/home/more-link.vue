<script setup lang="ts">
defineProps<{
  to: string
}>()
</script>

<template>
  <NuxtLink :to="to" class="flex items-center text-blue-500 hover:text-blue-600 whitespace-nowrap">
    <slot>{{ $t('common.more') }}</slot>
    <Icon name="ic:round-keyboard-double-arrow-right" />
  </NuxtLink>
</template>
