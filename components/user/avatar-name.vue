<script setup lang="ts">
withDefaults(defineProps<{
  user: User
  link?: boolean
  size?: number
}>(), {
  link: true,
  size: 6,
})
</script>

<template>
  <NuxtLink :to="`/profile/${user.id}`" class="flex items-center">
    <UserAvatar :user="user" class="mr-1" :size="size" :link="false" />
    <div class="whitespace-nowrap text-blue-500">
      {{ localeName(user.name, $i18n.locale) }}
    </div>
    <slot />
  </NuxtLink>
</template>
