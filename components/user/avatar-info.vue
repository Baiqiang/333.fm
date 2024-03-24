<script setup lang="ts">
defineProps<{
  user: User
}>()
</script>

<template>
  <NuxtLink :to="`/profile/${user.wcaId || user.id}`" class="flex gap-1 items-center">
    <UserAvatar :user="user" :size="8" :link="false" />
    <div class="w-full overflow-hidden">
      <div class="whitespace-nowrap text-blue-500 text-ellipsis overflow-hidden">
        {{ localeName(user.name, $i18n.locale) }}
      </div>
      <div v-if="$slots.info" class="text-gray-400 text-xs">
        <slot name="info" />
      </div>
    </div>
    <slot />
  </NuxtLink>
</template>
