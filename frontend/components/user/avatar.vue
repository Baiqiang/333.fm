<script setup lang="ts">
const props = withDefaults(defineProps<{
  user: User
  link?: boolean
  size?: number
}>(), {
  link: true,
  size: 6,
})

const FALLBACK_AVATAR = '/images/default-avatar.svg'

const cls = computed(() => `w-${props.size} h-${props.size}`)
const imgSrc = computed(() => props.user.avatarThumb || FALLBACK_AVATAR)

function onImgError(e: Event) {
  const img = e.target as HTMLImageElement
  if (img.src !== FALLBACK_AVATAR)
    img.src = FALLBACK_AVATAR
}
</script>

<template>
  <NuxtLink v-if="link" :to="`/profile/${userId(user)}`">
    <img :src="imgSrc" :class="cls" :title="user.name" class="bg-gray-200 dark:bg-gray-700" @error="onImgError">
  </NuxtLink>
  <img v-else :src="imgSrc" :class="cls" :title="user.name" class="bg-gray-200 dark:bg-gray-700" @error="onImgError">
</template>
