<script setup lang="ts">
const props = defineProps<{
  meta: PaginationMeta
}>()
const startPage = computed(() => {
  return Math.max(props.meta.currentPage - 3, 1)
})
const lastPage = computed(() => {
  return Math.min(props.meta.currentPage + 3, props.meta.totalPages)
})
const pages = computed(() => {
  const pages: number[] = []
  for (let i = startPage.value; i <= lastPage.value; i++)
    pages.push(i)
  return pages
})
</script>

<template>
  <div class="flex items-center justify-center gap-2 my-5 text-lg">
    <Pager v-if="meta.currentPage > 4" :page="1" />
    <span v-if="meta.currentPage > 4" class="pb-1">...</span>
    <Pager v-for="p in pages" :key="p" :page="p" :is-current="p === meta.currentPage" />
    <span v-if="meta.totalPages - meta.currentPage > 4" class="pb-1">...</span>
    <Pager v-if="meta.totalPages - meta.currentPage > 4" :page="meta.totalPages" />
  </div>
</template>
