<script setup lang="ts">
const route = useRoute()
const { data, error } = await useApi<User>(`/profile/${route.params.id}`)
if (error.value || !data.value) {
  throw createError({
    statusCode: error.value?.statusCode ?? 404,
  })
}
const user = ref<User>(data.value)
const submissions: Ref<Submission[]> = ref([])
const meta: Ref<PaginationMeta> = ref({
  totalItems: 0,
  itemCount: 0,
  itemsPerPage: DEFAULT_LIMIT,
  totalPages: 0,
  currentPage: 1,
})
async function fetchData() {
  const { data } = await useApi<Pagination<Submission>>(`/profile/${route.params.id}/submissions`, {
    params: {
      page: route.query.page,
      limit: DEFAULT_LIMIT,
    },
  })
  submissions.value = data.value!.items
  meta.value = data.value!.meta
}
watch(() => route.query.page, async () => {
  await fetchData()
}, {
  // immediate: true,
  deep: true,
})
await fetchData()
useSeoMeta({
  title: user.value.name,
})
</script>

<template>
  <div>
    <div class="flex gap-2 mt-4">
      <div class="font-bold text-lg">
        {{ user.name }}
      </div>
      <a v-if="user.wcaId" :href="`https://www.worldcubeassociation.org/persons/${user.wcaId}`" target="_blank" class="text-blue-500">
        <img src="https://www.worldcubeassociation.org/files/WCAlogo_notext.svg" class="w-6">
      </a>
    </div>
    <Submissions :submissions="submissions" spoiler />
    <Pagination :meta="meta" />
  </div>
</template>
