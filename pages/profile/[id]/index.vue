<script setup lang="ts">
const route = useRoute()
const bus = useEventBus('submission')
const user = inject(SYMBOL_USER)!
const submissions: Ref<Submission[]> = ref([])
const meta = usePaginationMeta()
bus.on(fetchData)
await fetchData()
watch(() => route.query, async () => {
  await fetchData()
}, {
  deep: true,
})
async function fetchData() {
  const { data } = await useApi<Pagination<Submission>>(`/profile/${route.params.id}/submissions`, {
    params: {
      page: route.query.page,
      type: route.query.type,
      limit: 50,
    },
  })
  submissions.value = data.value!.items
  meta.value = data.value!.meta
}
</script>

<template>
  <div>
    <Submissions :submissions="submissions" :user="user" />
    <Pagination :meta="meta" />
  </div>
</template>
