<script setup lang="ts">
defineProps<{
  user: User
}>()
</script>

<template>
  <NuxtLink :to="`/profile/${userId(user)}`" class="flex gap-1 items-center">
    <UserAvatar :user="user" :size="8" :link="false" />
    <div class="w-full overflow-hidden">
      <UserName :user="user" class="text-blue-500 text-ellipsis overflow-hidden" />
      <div v-if="$slots.info" class="text-gray-400 text-xs">
        <slot name="info" />
      </div>
    </div>
    <slot />
  </NuxtLink>
</template>
