<script setup lang="ts">
const { t } = useI18n()
const { params } = useRoute()
const bus = useEventBus('submission')
const user = useUser()
const { data, error } = await useApi<Competition>(`/fun-challenges/${params.alias}`)
if (!data.value || error.value) {
  throw createError({
    statusCode: 404,
  })
}

const competition = ref<Competition>(data.value)
const isOnGoing = computed(() => isInStatus(competition.value, CompetitionStatus.ON_GOING))
const typeLabel = computed(() => t(`funChallenge.types.${competition.value.subType}`))
const submissions = reactive<Record<number, Submission[]>>({})
const mySubmissions = computed(() => {
  const ret: Record<number, Submission[]> = {}
  for (const { id } of competition.value.scrambles)
    ret[id] = submissions[id]?.filter(submission => submission.user.id === user.id) ?? []

  return ret
})
const { data: results } = await useApi<{ regular: Result[], unlimited: Result[] }>(`/fun-challenges/${params.alias}/results`)
await fetchSubmissions()
async function fetchSubmissions() {
  const { data, refresh } = await useApi<Record<number, Submission[]>>(`/fun-challenges/${params.alias}/submissions`, {
    immediate: false,
  })
  await refresh()
  if (data.value)
    Object.assign(submissions, data.value)
}
useSeoMeta({
  title: `${competition.value.name} - ${t('funChallenge.title')}`,
})
useIntervalFn(fetchSubmissions, 5000)
bus.on(fetchSubmissions)
</script>

<template>
  <div>
    <BackTo to="/fun-challenges" :label="$t('funChallenge.title')" />
    <Heading1>
      {{ competition.name }}
    </Heading1>
    <WeeklyStatus :competition="competition" />
    <div class="my-2 text-sm bg-gray-50 border-l-2 md:border-l-4 border-blue-500 p-3">
      <div>
        {{ $t('funChallenge.type') }}: {{ typeLabel }}
      </div>
      <div>
        {{ $t('common.format') }}: {{ competition.format === CompetitionFormat.MO3 ? $t('common.mo3') : $t('common.bo1') }}
      </div>
      <div class="mt-1">
        {{ $t('funChallenge.rules') }}
      </div>
    </div>
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
        <ScrambleDisplay :scramble="scramble.scramble" />
        <CompetitionForm
          v-if="isOnGoing || mySubmissions[scramble.id]?.length"
          :scramble="scramble"
          :competition="competition"
          :submissions="mySubmissions[scramble.id]"
          type="fun-challenges"
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
