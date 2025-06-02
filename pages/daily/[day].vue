<script setup lang="ts">
const { t } = useI18n()
const { params } = useRoute()
const bus = useEventBus('submission')
const user = useUser()
const { data, error } = await useApi<Competition>(`/daily/${params.day}`)
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
const { data: results } = await useApi<{ regular: Result[], unlimited: Result[] }>(`/daily/${params.day}/results`)
await fetchSubmissions()
async function fetchSubmissions() {
  const { data, refresh } = await useApi<Record<number, Submission[]>>(`/daily/${params.day}/submissions`, {
    immediate: false,
  })
  await refresh()
  if (data.value)
    Object.assign(submissions, data.value)
}
useSeoMeta({
  title: `${competition.value.name} - ${t('daily.title')}`,
})
useIntervalFn(fetchSubmissions, 5000)
bus.on(fetchSubmissions)
</script>

<template>
  <div>
    <BackTo to="/daily" :label="$t('daily.title')" />
    <Heading1>
      {{ competition.name }}
    </Heading1>
    <WeeklyStatus :competition="competition" />
    <div class="flex items-center gap-1">
      <div>
        {{ $t('common.createdBy') }}
      </div>
      <UserAvatarName :user="competition.user" />
    </div>
    <WeeklyRules />
    <div class="flex justify-between my-4 text-sm">
      <NuxtLink v-if="competition.prevCompetition" class="bg-indigo-500 text-white px-3 py-2" :to="competitionPath(competition.prevCompetition)">
        {{ $t('weekly.previous') }}
      </NuxtLink>
      <div v-else />
      <NuxtLink v-if="competition.nextCompetition" class="bg-indigo-500 text-white px-3 py-2" :to="competitionPath(competition.nextCompetition)">
        {{ $t('weekly.next') }}
      </NuxtLink>
      <div v-else />
    </div>
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
          :scramble="scramble"
          :competition="competition"
          :submissions="mySubmissions[scramble.id]"
          type="daily"
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
