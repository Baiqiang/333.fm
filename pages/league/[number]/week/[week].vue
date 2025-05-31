<script setup lang="ts">
const user = useUser()
const { week } = useRoute().params
const bus = useEventBus('submission')

const session = inject(SYMBOL_LEAGUE_SESSION)!
const baseURL = `/league/session/${session.value.number}/${week}`
const isPlayer = computed(() => !!session.value.standings.find(s => s.userId === user.id))
const { data } = await useApi<TierSchedule[]>(`${baseURL}/schedules`)
const weekSchedules = ref<TierSchedule[]>(data.value || [])
const competition = ref<Competition>(session.value.competitions.find(c => c.alias.split('-')[2] === week)!)
const isOnGoing = computed(() => competition.value.status === CompetitionStatus.ON_GOING)
const { data: results } = await useApi<{ regular: Result[], unlimited: Result[] }>(`/league/session/${session.value.number}/${week}/results`)
const submissions = reactive<Record<number, Submission[]>>({})
const mySubmissions = computed(() => {
  const ret: Record<number, Submission[]> = {}
  for (const { id } of competition.value.scrambles)
    ret[id] = submissions[id]?.filter(submission => submission.user.id === user.id) ?? []

  return ret
})
await fetchSubmissions()
async function fetchSubmissions() {
  const { data, refresh } = await useApi<Record<number, Submission[]>>(`${baseURL}/submissions`, {
    immediate: false,
  })
  await refresh()
  if (data.value)
    Object.assign(submissions, data.value)
}
useSeoMeta({
  title: `${competition.value.name}`,
})
useIntervalFn(fetchSubmissions, 5000)
bus.on(fetchSubmissions)
</script>

<template>
  <div>
    <NuxtLink :to="`/league/${session.number}`" class="text-xs text-blue-500 float-right flex items-center">
      <Icon name="heroicons:chevron-double-left-16-solid" />{{ $t('common.backTo', { to: session.title }) }}
    </NuxtLink>
    <h1 class="font-bold text-xl md:text-3xl my-2">
      {{ competition.name }}
    </h1>
    <WeeklyStatus :competition="competition" />
    <LeagueRules />
    <CompetitionSiblings :competition="competition" />
    <Tabs>
      <Tab v-if="!isOnGoing && results?.regular.length" :name="$t('weekly.results')" hash="results">
        <WeeklyResults :results="results!.regular" />
      </Tab>
      <Tab v-if="!isOnGoing && results?.unlimited.length" :name="$t('league.allResults')" hash="results-unlimited">
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
        <p v-if="!isPlayer" class="text-gray-600 text-sm italic my-2">
          {{ $t('league.rules.others') }}
        </p>
        <CompetitionForm
          v-if="isOnGoing || mySubmissions[scramble.id]?.length"
          :scramble="scramble"
          :competition="competition"
          :submissions="mySubmissions[scramble.id]"
          :allow-unlimited="false"
          :type="`league/session/${session.number}`"
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
            <Submissions
              :submissions="submissions[scramble.id]"
              :competition="competition"
              :scramble="scramble"
              filterable
              :filters="[
                {
                  mode: CompetitionMode.REGULAR,
                  label: $t('league.mode.official'),
                },
                {
                  mode: CompetitionMode.UNLIMITED,
                  label: $t('league.mode.others'),
                },
              ]"
            />
          </template>
        </div>
      </Tab>
      <Tab name="Schedules" hash="schedules">
        <LeagueSchedules :tier-schedules="weekSchedules" />
      </Tab>
    </Tabs>
  </div>
</template>
