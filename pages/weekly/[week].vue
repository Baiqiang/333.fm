<script setup lang="ts">
const { t } = useI18n()
const { params } = useRoute()
const user = useUser()
const { data, error } = await useApi<Competition>(`/weekly/${params.week}`)
if (!data.value || error.value) {
  throw createError({
    statusCode: 404,
  })
}

const competition = ref<Competition>(data.value)
const isOnGoing = computed(() => competition.value.status === CompetitionStatus.ON_GOING)
const submissions = reactive<Record<number, Submission[]>>({})
const mySubmissions = computed(() => {
  const ret: Record<number, Submission[]> = {}
  for (const { id } of competition.value.scrambles) ret[id] = submissions[id]?.filter(submission => submission.user.id === user.id) ?? []

  return ret
})
const hideSolutions = reactive<Record<number, boolean>>({})
const { data: results } = await useApi<{ regular: Result[], unlimited: Result[] }>(`/weekly/${params.week}/results`)
await fetchSubmissions()
async function fetchSubmissions() {
  const { data, refresh } = await useApi<Record<number, Submission[]>>(`/weekly/${params.week}/submissions`, {
    immediate: false,
  })
  await refresh()
  if (data.value)
    Object.assign(submissions, data.value)
}
useSeoMeta({
  title: `${competition.value.name} - ${t('weekly.title')}`,
})
let timer: NodeJS.Timeout
onMounted(() => {
  timer = setInterval(() => {
    fetchSubmissions()
  }, 5000)
})
onUnmounted(() => {
  clearInterval(timer)
})
</script>

<template>
  <div>
    <h1 class="font-bold text-xl md:text-3xl my-2">
      {{ competition.name }}
    </h1>
    <WeeklyStatus :competition="competition" />
    <WeeklyRules />
    <Tabs>
      <Tab v-if="!isOnGoing" :name="$t('weekly.results')" hash="results">
        <WeeklyResults :results="results!.regular" />
      </Tab>
      <Tab v-if="!isOnGoing && results?.unlimited.length" :name="$t('weekly.unlimitedResults')" hash="results-unlimited">
        <WeeklyResults :results="results!.unlimited" />
      </Tab>
      <Tab
        v-for="scramble in competition.scrambles"
        :key="scramble.id"
        :name="$t('weekly.scramble', { number: scramble.number })"
        :hash="`scramble-${scramble.number}`"
      >
        <Sequence :sequence="scramble.scramble" :source="scramble.scramble" />
        <CubeExpanded :moves="scramble.scramble" />
        <WeeklyForm
          v-if="isOnGoing"
          :scramble="scramble"
          :competition="competition"
          :submissions="mySubmissions[scramble.id]"
          @submitted="fetchSubmissions"
        />
        <h2 class="text-lg font-semibold my-2">
          {{ $t('weekly.solutions') }}
        </h2>
        <div>
          <div v-if="!submissions[scramble.id]">
            {{ $t('weekly.noSolution') }}
          </div>
          <button
            v-else-if="mySubmissions[scramble.id]?.length === 0 && !hideSolutions[scramble.id] && isOnGoing"
            class="bg-indigo-500 text-white p-2"
            @click="hideSolutions[scramble.id] = true"
          >
            {{ $t('weekly.seeSolutions', { solutions: submissions[scramble.id].length }, submissions[scramble.id].length) }}
          </button>
          <template v-else>
            <WeeklySubmissions :submissions="submissions[scramble.id]" />
          </template>
        </div>
      </Tab>
    </Tabs>
  </div>
</template>
