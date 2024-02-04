<script setup lang="ts">
withDefaults(defineProps<{
  user: User
  link: boolean
}>(), {
  link: true,
})
</script>

<template>
  <NuxtLink v-if="link" :to="`/profile/${user.id}`">
    <img :src="user.avatarThumb" class="w-6 h-6" :title="user.name">
  </NuxtLink>
  <img v-else :src="user.avatarThumb" class="w-6 h-6" :title="user.name">
</template>
