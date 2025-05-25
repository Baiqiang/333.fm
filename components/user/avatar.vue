<script setup lang="ts">
const props = withDefaults(defineProps<{
  user: User
  link?: boolean
  size?: number
}>(), {
  link: true,
  size: 6,
})
const cls = computed(() => `w-${props.size} h-${props.size}`)
const imgSrc = computed(() => props.user.avatarThumb || '/images/default-avatar.png')
</script>

<template>
  <NuxtLink v-if="link" :to="`/profile/${userId(user)}`">
    <img :src="imgSrc" :class="cls" :title="user.name">
  </NuxtLink>
  <img v-else :src="imgSrc" :class="cls" :title="user.name">
</template>
