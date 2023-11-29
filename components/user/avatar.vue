<script setup lang="ts">
defineProps<{
  user: User
}>()
</script>

<template>
  <img :src="user.avatarThumb" class="w-6 h-6" :title="user.name">
</template>
