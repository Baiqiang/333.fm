<script setup lang="ts">
defineProps<{
  user: User
}>()
</script>

<template>
  <div class="flex items-center">
    <UserAvatar :user="user" class="mr-1" />
    <div class="whitespace-nowrap">
      {{ localeName(user.name, $i18n.locale) }}
    </div>
    <slot />
  </div>
</template>
