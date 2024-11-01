<script setup lang="ts">
import { NuxtLink } from '#components'

withDefaults(defineProps<{
  user: User
  size?: number
  link?: boolean
}>(), {
  size: 6,
  link: true,
})
</script>

<template>
  <component :is="link ? NuxtLink : 'div'" :to="`/profile/${userId(user)}`" class="flex items-center">
    <UserAvatar :user="user" class="mr-1" :size="size" :link="false" />
    <UserName :user="user" :class="{ 'text-blue-500': link }" />
    <slot />
  </component>
</template>
