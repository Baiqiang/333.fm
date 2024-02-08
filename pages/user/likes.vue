<script setup lang="ts">
definePageMeta({
  middleware: 'auth',
})
const { t } = useI18n()
const route = useRoute()
const bus = useEventBus('submission')
const submissions = ref<Submission[]>([])
const meta = usePaginationMeta()
bus.on(fetchData)
await fetchData()
async function fetchData() {
  const { data } = await useApi<Pagination<Submission>>('/user/likes', {
    params: {
      page: route.query.page,
      limit: DEFAULT_LIMIT,
    },
  })
  submissions.value = data.value!.items
  meta.value = data.value!.meta
}
useSeoMeta({
  title: t('user.likes'),
})
</script>

<template>
  <div class="">
    <h2 class="font-bold text-lg my-2">
      {{ $t('user.likes') }}
    </h2>
    <Submissions :submissions="submissions" />
    <Pagination :meta="meta" @update="fetchData" />
  </div>
</template>
