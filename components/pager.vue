<script setup lang="ts">
const props = defineProps<{
  page: string | number
  isCurrent?: boolean
}>()
const route = useRoute()
function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}
const link = computed(() => {
  const page = props.page.toString() === '1' ? undefined : props.page.toString()
  return {
    ...route,
    query: {
      ...route.query,
      page,
    },
  }
})
</script>

<template>
  <NuxtLink :to="link" class="px-3 py-1" :class="{ 'bg-blue-500 text-white cursor-pointer': !isCurrent, 'bg-gray-200 text-black': isCurrent }" @click="scrollToTop">
    {{ page }}
  </NuxtLink>
</template>
