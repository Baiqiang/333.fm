<script setup lang="ts">
const props = defineProps<{
  user: User
}>()
const { locale } = useI18n()
const name = computed(() => {
  const matches = props.user.name.match(/^(.+?) \((.+)\)$/)
  if (!matches)
    return props.user.name

  return locale.value === 'en' ? matches[1] : matches[2]
})
</script>

<template>
  <div class="flex justify-between gap-2">
    <div class="flex items-center justify-start gap-2">
      <img :src="user.avatarThumb" class="w-6 h-6">
      {{ name }}
    </div>
    <slot />
  </div>
</template>
