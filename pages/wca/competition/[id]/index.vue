<script setup lang="ts">
const { t } = useI18n()
const config = useRuntimeConfig().public
const route = useRoute()
const wcaCompetition = inject(SYMBOL_WCA_COMPETITION)
const liveCompetition = inject(SYMBOL_WCA_LIVE_COMPETITION)
const wcaCompetitionId = computed(() => route.params.id as string)

const isEnded = computed(() => {
  if (!wcaCompetition?.value?.end_date)
    return false

  const endDate = new Date(wcaCompetition.value.end_date)
  endDate.setDate(endDate.getDate() + 1)
  return endDate < new Date()
})

const hasStarted = computed(() => {
  if (!wcaCompetition?.value?.start_date)
    return false
  return new Date(wcaCompetition.value.start_date) <= new Date()
})

interface WcaOfficialRound {
  roundTypeId: string
  results: WCAResult[]
}

interface WcaEventRound {
  id: string
  format: string
}

const officialRounds = ref<WcaOfficialRound[]>([])
const eventRounds = ref<WcaEventRound[]>([])

const { data: officialData } = await useApi<{ rounds: WcaOfficialRound[] }>(
  `${config.wca.apiBaseURL}/competitions/${wcaCompetitionId.value}/results/333fm`,
)
if (officialData.value?.rounds?.length) {
  officialRounds.value = officialData.value.rounds.filter(r => r.results.length > 0)
}

const hasOfficialResults = computed(() => officialRounds.value.length > 0)

if (!hasOfficialResults.value) {
  const { data: eventsData } = await useApi<{ id: string, rounds: WcaEventRound[] }[]>(
    `${config.wca.apiBaseURL}/competitions/${wcaCompetitionId.value}/events`,
  )
  const fmEvent = eventsData.value?.find(e => e.id === '333fm')
  if (fmEvent?.rounds?.length) {
    eventRounds.value = fmEvent.rounds
  }
}

const liveEvents = computed(() => (liveCompetition?.value?.competitionEvents ?? []).filter(event => event.event.id === '333fm'))
const liveRounds = computed(() => liveEvents.value[0]?.rounds ?? [])
const liveRoundsResults = reactive<Record<string, WCALiveRound>>({})

const useLive = computed(() => !hasOfficialResults.value && liveRounds.value.length > 0)

onMounted(async () => {
  if (useLive.value) {
    await fetchLiveResults()
  }
})

const { pause } = useIntervalFn(async () => {
  if (useLive.value && !isEnded.value) {
    await fetchLiveResults()
  }
}, 1000)

if (isEnded.value || hasOfficialResults.value) {
  pause()
}

async function fetchLiveResults() {
  await Promise.all(liveRounds.value.map(async (round) => {
    const { data } = await useAsyncQuery<{ round: WCALiveRound }>(WCA_LIVE_ROUND_QUERY, { id: round.id })
    if (!data.value?.round)
      return
    liveRoundsResults[round.id] = data.value.round
  }))
}

function officialToLiveResults(results: WCAResult[]): WCALiveRoundResult[] {
  return results.map(r => ({
    id: String(r.id),
    ranking: r.pos,
    advancing: false,
    advancingQuestionable: false,
    best: r.best,
    average: r.average,
    person: { id: r.wca_id, name: r.name, country: { iso2: r.country_iso2, name: '' } },
    singleRecordTag: r.regional_single_record ?? '',
    averageRecordTag: r.regional_average_record ?? '',
    attempts: r.attempts.filter(v => v !== 0).map(v => ({ result: v })),
  }))
}

interface DisplayRound {
  key: string
  name: string
  results: WCALiveRoundResult[] | null
  loading: boolean
}

const displayRounds = computed<DisplayRound[]>(() => {
  if (hasOfficialResults.value) {
    return officialRounds.value.map(r => ({
      key: r.roundTypeId,
      name: t(`result.roundType.${r.roundTypeId}`),
      results: officialToLiveResults(r.results),
      loading: false,
    }))
  }

  if (liveRounds.value.length > 0) {
    return liveRounds.value.map(r => ({
      key: r.id,
      name: r.name,
      results: liveRoundsResults[r.id]?.results ?? null,
      loading: !liveRoundsResults[r.id],
    }))
  }

  if (eventRounds.value.length > 0) {
    return eventRounds.value.map((r, i) => ({
      key: r.id,
      name: `Round ${i + 1}`,
      results: null,
      loading: false,
    }))
  }

  return []
})

const displayName = computed(() => liveCompetition?.value?.name ?? wcaCompetition?.value?.name ?? '')
</script>

<template>
  <div>
    <h1 class="text-3xl font-bold my-2">
      {{ displayName }}
    </h1>

    <div class="flex items-center gap-2 text-sm my-2">
      <a :href="`https://www.worldcubeassociation.org/competitions/${wcaCompetitionId}`" target="_blank" class="text-blue-500 flex items-center gap-1">
        <Icon name="heroicons:globe-alt-16-solid" size="14" />
        WCA
      </a>
      <a v-if="liveCompetition" :href="`https://live.worldcubeassociation.org/competitions/${liveCompetition.id}`" target="_blank" class="text-blue-500 flex items-center gap-1">
        <Icon name="heroicons:signal-16-solid" size="14" />
        Live
      </a>
    </div>

    <NuxtLink
      v-if="hasStarted"
      :to="`/wca/reconstruction/${wcaCompetitionId}`"
      class="inline-flex items-center gap-2 my-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium shadow-sm transition-colors"
    >
      <Icon name="heroicons:document-text-16-solid" />
      {{ t('wca.recon.viewReconstructions') }}
    </NuxtLink>

    <Tabs v-if="displayRounds.length > 0">
      <Tab v-for="round in displayRounds" :key="round.key" :name="round.name" :hash="round.key">
        <Loading v-if="round.loading" />
        <div v-else-if="round.results && round.results.length > 0" class="mb-6 p-4 bg-gray-50 shadow w-full overflow-x-auto">
          <WcaLiveResults :results="round.results" />
        </div>
        <div v-else class="text-sm text-gray-400 italic py-4">
          {{ t('wca.noResults') }}
        </div>
      </Tab>
    </Tabs>
  </div>
</template>
