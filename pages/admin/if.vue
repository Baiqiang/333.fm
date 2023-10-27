<script setup lang="ts">
const { t } = useI18n()
const route = useRoute()
useSeoMeta({
  title: t('admin.if.title'),
})
const adminIFs: Ref<AdminIF[]> = ref([])
const meta: Ref<PaginationMeta> = ref({
  totalItems: 0,
  itemCount: 0,
  itemsPerPage: DEFAULT_LIMIT,
  totalPages: 0,
  currentPage: 1,
})
async function fetchData() {
  const { data } = await useApi<Pagination<AdminIF>>('/admin/if', {
    params: {
      page: route.query.page,
      limit: DEFAULT_LIMIT,
    },
  })
  adminIFs.value = data.value!.items
  meta.value = data.value!.meta
}
watch(() => route.query.page, async () => {
  await fetchData()
}, {
  // immediate: true,
  deep: true,
})
await fetchData()
</script>

<template>
  <div>
    <h1 class="text-xl font-semibold py-3">
      {{ $t('admin.if.title') }}
    </h1>
    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6 sm:gap-x-2 md:gap-x-3 gap-y-1">
      <IfSummary v-for="adminIF in adminIFs" :key="adminIF.hash" :finder="adminIF" :users="adminIF.users" />
    </div>
    <Pagination :meta="meta" />
  </div>
</template>
