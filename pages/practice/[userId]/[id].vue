<script setup lang="ts">
const { params } = useRoute()
const { t, locale } = useI18n()
const bus = useEventBus('submission')
const user = useUser()
const profile = inject(SYMBOL_USER)!
if (!profile) {
  throw createError({
    statusCode: 404,
  })
}
const id = params.id as string
const basePath = `/practice/practice-${profile.value.id}-${id}`
const { data, error } = await useApi<Practice>(basePath)
if (error.value || !data.value) {
  throw createError({
    statusCode: error.value?.statusCode ?? 404,
  })
}
const competition = ref<Practice>(data.value)
const submissions = reactive<Record<number, Submission[]>>({})
const results: Ref<Result[]> = ref([])
const mySubmissions = computed(() => {
  const ret: Record<number, Submission[]> = {}
  for (const { id } of competition.value.scrambles)
    ret[id] = submissions[id]?.filter(submission => submission.user.id === user.id) ?? []

  return ret
})
await fetchData()
async function fetchData() {
  await Promise.all([
    fetchSubmissions(),
    fetchResults(),
  ])
}
async function fetchResults() {
  const { data, refresh } = await useApi<Result[]>(`${basePath}/results`, {
    immediate: false,
  })
  await refresh()
  if (data.value)
    results.value = data.value
}
async function fetchSubmissions() {
  const { data, refresh } = await useApi<Record<number, Submission[]>>(`${basePath}/submissions`, {
    immediate: false,
  })
  await refresh()
  if (data.value)
    Object.assign(submissions, data.value)
}
useSeoMeta({
  title: computed(() => `${t('practice.number', { number: id })} - ${t('practice.user.title', {
    name: localeName(profile.value.name, locale.value),
  })}`),
})
// useIntervalFn(fetchData, 5000)
bus.on(fetchData)
</script>

<template>
  <div>
    <NuxtLink to="/practice/new" class="bg-indigo-500 text-white px-3 py-2 mb-2 inline-flex items-center gap-1">
      <Icon name="ic:twotone-plus" />
      {{ $t('common.new') }}
    </NuxtLink>
    <NuxtLink :to="`/practice/${profile.wcaId || profile.id}`" class="text-xs text-blue-500 float-right flex items-center">
      <Icon name="heroicons:chevron-double-left-16-solid" />{{ $t('common.backTo', { to: $t('practice.user.title', {
        name: localeName(profile.name, locale),
      }) }) }}
    </NuxtLink>
    <h2 class="font-semibold text-lg mt-2">
      {{ $t('practice.number', { number: id }) }}
    </h2>
    <WeeklyStatus :competition="competition" />
    <Tabs>
      <Tab
        v-for="scramble in competition.scrambles"
        :key="scramble.id"
        :name="$t('weekly.scramble', { number: scramble.number })"
        :hash="`scramble-${scramble.number}`"
      >
        <Sequence :sequence="scramble.scramble" :source="scramble.scramble" />
        <CubeExpanded :moves="scramble.scramble" />
        <CompetitionForm
          :scramble="scramble"
          :competition="competition"
          :submissions="mySubmissions[scramble.id]"
          :allow-unlimited="false"
          type="practice"
          @submitted="fetchData"
        />
        <div class="flex justify-between mt-4">
          <NuxtLink v-if="competition.prevIndex" class="bg-indigo-500 text-white px-3 py-2" :to="`/practice/${profile.wcaId || profile.id}/${competition.prevIndex}`">
            {{ $t('practice.previous') }}
          </NuxtLink>
          <div v-else />
          <NuxtLink v-if="competition.nextIndex" class="bg-indigo-500 text-white px-3 py-2" :to="`/practice/${profile.wcaId || profile.id}/${competition.nextIndex}`">
            {{ $t('practice.next') }}
          </NuxtLink>
          <div v-else />
        </div>
        <h2 class="text-lg font-semibold my-2">
          {{ $t('weekly.solutions') }}
        </h2>
        <div>
          <div v-if="!submissions[scramble.id]">
            {{ $t('weekly.noSolution') }}
          </div>
          <Spoiler
            v-else
            :spoiled="$t('weekly.solutions')"
            :show="mySubmissions[scramble.id]?.length > 0"
          >
            <Submissions :submissions="submissions[scramble.id]" :competition="competition" :scramble="scramble" />
          </Spoiler>
        </div>
      </Tab>
      <Tab v-if="results.length > 0" :name="$t('weekly.results')" hash="results">
        <Spoiler
          :spoiled="$t('weekly.results')"
          :show="competition.scrambles.every(scramble => mySubmissions[scramble.id]?.length > 0)"
          class="my-2"
        >
          <WeeklyResults :results="results" />
        </Spoiler>
      </Tab>
    </Tabs>
  </div>
</template>
