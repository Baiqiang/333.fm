<script setup lang="ts">
const { t } = useI18n()
const route = useRoute()
const { data: user, error } = await useApi<User>(`/admin/user/${route.query.id}`)
if (error.value) {
  throw createError({
    statusCode: 404,
    message: error.value.message,
  })
}

useSeoMeta({
  title: t('admin.user.if', { name: user.value!.name ?? 'Unknown' }),
})
const userIFs: Ref<InsertionFinder[]> = ref([])
const meta = usePaginationMeta()
async function fetchData() {
  const { data } = await useApi<Pagination<InsertionFinder>>(`/admin/user/${route.query.id}/ifs`, {
    params: {
      page: route.query.page,
      limit: DEFAULT_LIMIT,
    },
  })
  userIFs.value = data.value!.items
  meta.value = data.value!.meta
}
await fetchData()
</script>

<template>
  <div>
    <Heading1>
      {{ $t('admin.user.if', { name: user?.name ?? 'Unknown' }) }}
    </Heading1>
    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6 sm:gap-x-2 md:gap-x-3 gap-y-1">
      <IfSummary v-for="userIF in userIFs" :key="userIF.hash" :finder="userIF" />
    </div>
    <Pagination :meta="meta" @update="fetchData" />
  </div>
</template>
