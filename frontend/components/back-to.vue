<script setup lang="ts">
defineProps<{
  to: string
  label: string
  back?: boolean
}>()

const router = useRouter()
</script>

<template>
  <NuxtLink v-if="!back" :to="to" class="text-xs text-blue-500 float-right flex items-center">
    <Icon name="heroicons:chevron-double-left-16-solid" />{{ $t('common.backTo', { to: label }) }}
  </NuxtLink>
  <button v-else class="text-xs text-blue-500 float-right flex items-center" @click="router.back()">
    <Icon name="heroicons:chevron-double-left-16-solid" />{{ $t('common.backTo', { to: label }) }}
  </button>
</template>
