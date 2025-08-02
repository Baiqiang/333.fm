<script setup lang="ts">
const user = useUser()
const { week } = useRoute().params
const bus = useEventBus('submission')

const session = inject(SYMBOL_LEAGUE_SESSION)!
const baseURL = `/league/session/${session.value.number}/${week}`
const { data: data1, error: error1 } = await useApi<Competition>(baseURL)
if (error1.value || !data1.value) {
  throw createError({
    statusCode: 404,
    statusMessage: 'Competition not found',
  })
}
const competition = ref<Competition>(data1.value!)
const isPlayer = computed(() => !!session.value.standings.find(s => s.userId === user.id))
const playerTiers = computed(() => {
  const tierMap = session.value.tiers.reduce((acc, s) => {
    acc[s.id] = s
    return acc
  }, {} as Record<number, LeagueTier>)
  const ret: Record<number, LeagueTier> = {}
  for (const s of session.value.standings)
    ret[s.userId] = tierMap[s.tierId]
  return ret
})
const { data: data2 } = await useApi<TierSchedule[]>(`${baseURL}/schedules`)
const weekSchedules = ref<TierSchedule[]>(data2.value || [])
const isOnGoing = computed(() => isInStatus(competition.value, CompetitionStatus.ON_GOING))
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
  <div class="">
    <BackTo :to="`/league/${session.number}`" :label="session.title" />
    <Heading1>
      {{ competition.name }}
    </Heading1>
    <WeeklyStatus :competition="competition" />
    <LeagueRules />
    <CompetitionSiblings :competition="competition" />
    <LeagueParticipate v-if="isOnGoing" :session="session" />
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
        <StickyScramble :scramble="scramble.scramble" />
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
        <MaybeSubmissions
          :competition="competition"
          :scramble="scramble"
          :submissions="submissions[scramble.id] || []"
          filterable
          sortable
          :filters="[
            {
              key: CompetitionMode.REGULAR,
              label: $t('league.mode.participants'),
            },
            ...session.tiers.map(tier => ({
              key: `tier-${tier.id}`,
              label: tier.name,
              filter: (submission: Submission) => submission.mode === CompetitionMode.REGULAR && playerTiers[submission.user.id]?.id === tier.id,
            })),
            {
              key: CompetitionMode.UNLIMITED,
              label: $t('league.mode.others'),
            },
          ]"
        >
          <template #extra="submission">
            <div v-if="playerTiers[submission.user.id]" class="text-xs text-black px-1 rounded" :class="tierBackgrounds[playerTiers[submission.user.id].level - 1]">
              {{ playerTiers[submission.user.id].name }}
            </div>
          </template>
        </MaybeSubmissions>
      </Tab>
      <Tab name="Schedules" hash="schedules">
        <LeagueSchedules :tier-schedules="weekSchedules" />
      </Tab>
    </Tabs>
  </div>
</template>
