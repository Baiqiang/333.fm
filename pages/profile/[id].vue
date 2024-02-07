<script setup lang="ts">
import type { RouteLocationRaw } from '#vue-router'

const route = useRoute()
const { t } = useI18n()
const { data, error } = await useApi<User>(`/profile/${route.params.id}`)
if (error.value || !data.value) {
  console.log(error.value)
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
  filters: [],
})
const filters = computed(() => {
  if (meta.value.totalItems === 0)
    return []

  const total = (meta.value as any).filters.reduce((n: number, { count }: any) => Number(count) + n, 0)
  const filters: { to: RouteLocationRaw, label: string, type?: any }[] = [{
    to: {
      ...route,
      query: {
        ...route.query,
        type: undefined,
        page: undefined,
      },
    },
    label: `${t('common.all')} (${total})`,
  }]
  for (const filter of (meta.value as any).filters || []) {
    let label = ''
    switch (filter.type) {
      case CompetitionType.WEEKLY:
        label = t('weekly.title')
        break
      case CompetitionType.ENDLESS:
        label = t('endless.title')
        break
    }
    filters.push({
      to: {
        ...route,
        query: {
          ...route.query,
          type: filter.type,
          page: undefined,
        },
      },
      label: `${label} (${filter.count})`,
      type: filter.type,
    })
  }
  return filters
})
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
      limit: DEFAULT_LIMIT,
    },
  })
  submissions.value = data.value!.items
  meta.value = data.value!.meta
}
function isSameType(a: any, b: any): boolean {
  console.log(a, b)
  if (a === undefined)
    return b === undefined

  return Number(a) === Number(b)
}
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
    <div v-if="filters.length > 0" class="flex flex-wrap gap-2 mt-2">
      <NuxtLink
        v-for="{ to, label, type }, i in filters"
        :key="i"
        :to="to"
        class="px-2 py-2 text-white whitespace-nowrap"
        :class="{
          'bg-indigo-500': !isSameType($route.query.type, type),
          'bg-gray-500': isSameType($route.query.type, type),
        }"
      >
        {{ label }}
      </NuxtLink>
    </div>
    <Submissions :submissions="submissions" />
    <Pagination :meta="meta" />
  </div>
</template>
