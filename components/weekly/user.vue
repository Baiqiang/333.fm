<script setup lang="ts">
import { localeName } from '~/utils/user'

const props = defineProps<{
  user: User
}>()
const { locale } = useI18n()
const name = computed(() => localeName(props.user.name, locale.value))
</script>

<template>
  <div class="flex justify-between gap-2 shrink-0">
    <div class="flex items-center justify-start gap-2">
      <UserAvatar :user="user" />
      <div class="whitespace-nowrap">
        {{ name }}
      </div>
    </div>
    <slot />
  </div>
</template>
