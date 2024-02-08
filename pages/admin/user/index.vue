<script setup lang="ts">
import type { AdminUser } from '~/utils/user'

const { t } = useI18n()
const route = useRoute()
useSeoMeta({
  title: t('admin.user.title'),
})
const users: Ref<AdminUser[]> = ref([])
const PER_PAGE = 50
const meta = usePaginationMeta()
async function fetchData() {
  const { data } = await useApi<Pagination<AdminUser>>('/admin/users', {
    params: {
      page: route.query.page,
      limit: PER_PAGE,
    },
  })
  users.value = data.value!.items
  meta.value = data.value!.meta
}
await fetchData()
</script>

<template>
  <div>
    <h1 class="text-xl font-semibold py-3">
      {{ $t('admin.user.title') }}
    </h1>
    <div class="whitespace-nowrap overflow-x-auto">
      <div class="grid grid-cols-[80px_1fr_1fr_1fr] gap-y-2">
        <div class="font-bold text-right pr-2 border-b-2 border-gray-300">
          ID
        </div>
        <div class="font-bold border-b-2 border-gray-300">
          {{ $t('user.name') }}
        </div>
        <div class="font-bold border-b-2 border-gray-300">
          WCA ID
        </div>
        <div class="font-bold border-b-2 border-gray-300">
          {{ $t('admin.user.ifs') }}
        </div>
        <template v-for="user in users" :key="user.id">
          <NuxtLink :to="{ path: '/admin/user/if', query: { id: user.id } }" class="text-right font-mono text-blue-500 pr-2 border-b border-gray-300">
            {{ user.id }}
          </NuxtLink>
          <div class="border-b border-gray-300">
            {{ user.name }}
          </div>
          <div class="border-b border-gray-300">
            <a
              v-if="user.wcaId"
              :href="`https://cubing.com/results/person/${user.wcaId}`"
              target="_blank"
              class="text-blue-500"
            >
              {{ user.wcaId }}
            </a>
          </div>
          <div class="border-b border-gray-300">
            {{ user.finders }}
          </div>
        </template>
      </div>
    </div>
    <Pagination :meta="meta" @update="fetchData" />
  </div>
</template>
