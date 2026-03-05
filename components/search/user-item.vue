<script setup lang="ts">
defineProps<{
  user: User
}>()
</script>

<template>
  <NuxtLink :to="`/profile/${userId(user)}`" class="flex items-center gap-3 p-3 bg-white shadow-sm hover:shadow-md transition-all duration-200">
    <UserAvatar :user="user" :link="false" :size="10" />
    <div>
      <div class="font-medium">
        {{ user.name }}
      </div>
      <div v-if="user.wcaId" class="text-sm text-gray-500">
        {{ user.wcaId }}
      </div>
    </div>
  </NuxtLink>
</template>
