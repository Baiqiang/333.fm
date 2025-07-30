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
const isOnGoing = computed(() => isInStatus(competition.value, CompetitionStatus.ON_GOING))
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
        <StickyScramble :scramble="scramble.scramble" />
        <CubeExpanded :moves="scramble.scramble" />
        <CompetitionForm
          v-if="isOnGoing || mySubmissions[scramble.id]?.length"
          :scramble="scramble"
          :competition="competition"
          :submissions="mySubmissions[scramble.id]"
          @submitted="fetchSubmissions"
        />
        <MaybeSubmissions
          :competition="competition"
          :scramble="scramble"
          :submissions="submissions[scramble.id] || []"
          filterable
          sortable
        />
      </Tab>
    </Tabs>
  </div>
</template>
