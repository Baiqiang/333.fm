<script setup lang="ts">
const { t } = useI18n()
const { params } = useRoute()
const bus = useEventBus('submission')
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
  for (const { id } of competition.value.scrambles)
    ret[id] = submissions[id]?.filter(submission => submission.user.id === user.id) ?? []

  return ret
})
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
useIntervalFn(fetchSubmissions, 5000)
bus.on(fetchSubmissions)
</script>

<template>
  <div>
    <BackTo to="/weekly" :label="$t('weekly.title')" />
    <Heading1>
      {{ competition.name }}
    </Heading1>
    <WeeklyStatus :competition="competition" />
    <WeeklyRules />
    <CompetitionSiblings :competition="competition" />
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
        <CompetitionForm
          v-if="isOnGoing || mySubmissions[scramble.id]?.length"
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
          <div
            v-else-if="mySubmissions[scramble.id]?.length === 0 && isOnGoing"
          >
            {{ $t('weekly.seeSolutions', { solutions: submissions[scramble.id].length }, submissions[scramble.id].length) }}
          </div>
          <template v-else>
            <Submissions :submissions="submissions[scramble.id]" :competition="competition" :scramble="scramble" filterable />
          </template>
        </div>
      </Tab>
    </Tabs>
  </div>
</template>
