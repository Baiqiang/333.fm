<script setup lang="ts">
defineProps<{
  user: User
}>()
</script>

<template>
  <div class="whitespace-nowrap">
    {{ localeName(user.name, $i18n.locale) }}
  </div>
</template>
