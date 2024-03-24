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
</script>

<template>
  <NuxtLink v-if="link" :to="`/profile/${user.wcaId || user.id}`">
    <img :src="user.avatarThumb" :class="cls" :title="user.name">
  </NuxtLink>
  <img v-else :src="user.avatarThumb" :class="cls" :title="user.name">
</template>
