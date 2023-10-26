<script setup lang="ts">
defineProps<{
  page: string | number
  isCurrent?: boolean
}>()
const router = useRouter()
const route = useRoute()
function goPage(page: number | string) {
  const query = { ...route.query }
  if (page === 1)
    delete query.page
  else
    query.page = page.toString()
  router.push({ ...route, query })
}
</script>

<template>
  <div class="px-3 py-1" :class="{ 'bg-blue-500 text-white cursor-pointer': !isCurrent, 'bg-gray-200 text-black': isCurrent }" @click="goPage(page)">
    {{ page }}
  </div>
</template>
