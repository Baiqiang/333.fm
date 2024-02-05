<script setup lang="ts">
defineProps<{
  user: User
}>()
</script>

<template>
  <NuxtLink :to="`/profile/${user.id}`" class="flex items-center">
    <UserAvatar :user="user" class="mr-1" :link="false" />
    <div class="whitespace-nowrap text-blue-500">
      {{ localeName(user.name, $i18n.locale) }}
    </div>
    <slot />
  </NuxtLink>
</template>
