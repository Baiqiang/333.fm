<script setup lang="ts">
const route = useRoute()
const bus = useEventBus('submission')
const user = inject(SYMBOL_USER)!
const submissions: Ref<Submission[]> = ref([])
bus.on(fetchData)
await fetchData()
const joinedEndlesses = ref<Endless[]>([])
const { data } = await useApi<Endless[]>(`/profile/${route.params.id}/joined-endless`)
joinedEndlesses.value = data.value || []
watch(() => route.query, async () => {
  await fetchData()
}, {
  deep: true,
})
const filters = computed(() => {
  return joinedEndlesses.value.map(endless => ({
    to: {
      ...route,
      query: {
        ...route.query,
        challenge: endless.alias,
      },
    },
    endless,
  }))
})
async function fetchData() {
  const { data } = await useApi<Submission[]>(`/profile/${route.params.id}/endless`, {
    params: {
      challenge: route.query.challenge,
    },
  })
  submissions.value = data.value!
}
function isSameChallenge(a: any, b: any): boolean {
  if (a === undefined)
    return b === undefined

  return a === b
}
</script>

<template>
  <div>
    <div v-if="filters.length > 0" class="flex flex-wrap gap-2 mt-2">
      <NuxtLink
        :to="`/profile/${userId(user)}/endless`"
        class="px-2 py-2 text-white whitespace-nowrap transition-colors duration-200"
        :class="{
          'bg-indigo-500': $route.query.challenge !== undefined,
          'bg-gray-500': $route.query.challenge === undefined,
        }"
      >
        {{ $t('common.all') }}
      </NuxtLink>
      <NuxtLink
        v-for="{ to, endless } in filters"
        :key="endless.id"
        :to="to"
        class="px-2 py-2 text-white whitespace-nowrap transition-colors duration-200"
        :class="{
          'bg-indigo-500': !isSameChallenge($route.query.challenge, endless.alias),
          'bg-gray-500': isSameChallenge($route.query.challenge, endless.alias),
        }"
      >
        {{ endless.name }}
      </NuxtLink>
    </div>
    <Submissions :submissions="submissions" :user="user" />
  </div>
</template>
