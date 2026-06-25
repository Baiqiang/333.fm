<script setup lang="ts">
const { t } = useI18n()
const route = useRoute()
const user = useUser()
const wcaCompetition = inject(SYMBOL_WCA_COMPETITION)
const wcaCompetitionId = computed(() => route.params.id as string)

const hasStarted = computed(() => {
  if (!wcaCompetition?.value?.start_date)
    return false
  return new Date(wcaCompetition.value.start_date) <= new Date()
})

const { data: reconData, refresh: refreshReconData } = await useApi<WcaReconstructionCompetitionData>(`wca/reconstruction/${wcaCompetitionId.value}`)
const syncingWcaData = ref(false)
const syncWcaDataError = ref('')
const syncWcaDataQueued = ref(false)

const bus = useEventBus('submission')
bus.on(() => refreshReconData())

const myRecon = computed(() =>
  reconData.value?.recons.find(r => r.userId === user.id) ?? null,
)

const displayName = computed(() => wcaCompetition?.value?.name ?? wcaCompetitionId.value)

const reconByUserId = computed(() => {
  const map: Record<number, WcaReconstruction> = {}
  for (const r of reconData.value?.recons ?? []) map[r.userId] = r
  return map
})

const mySubmissions = computed(() => {
  const ret: Record<number, Submission[]> = {}
  for (const { id } of reconData.value?.scrambles ?? [])
    ret[id] = reconData.value?.submissions[id]?.filter(submission => submission.user.id === user.id) ?? []

  return ret
})

interface ScrambleTab {
  roundNumber: number
  scrambleNumber: number
  label: string
  hash: string
  scramble?: Scramble
}

const scrambleTabs = computed<ScrambleTab[]>(() => {
  const tabs: ScrambleTab[] = []
  if (!reconData.value)
    return tabs

  const roundNumbers = new Set<number>()
  for (const s of reconData.value.scrambles) roundNumbers.add(s.roundNumber!)
  for (const rn of Object.keys(reconData.value.attemptsPerRound ?? {})) {
    const roundNumber = Number(rn)
    if (roundNumber)
      roundNumbers.add(roundNumber)
  }
  if (reconData.value.currentUser?.attempts) {
    for (const key of Object.keys(reconData.value.currentUser.attempts)) {
      const rn = Number(key.split('-')[0])
      if (rn)
        roundNumbers.add(rn)
    }
  }
  if (roundNumbers.size === 0)
    roundNumbers.add(1)
  const hasMultipleRounds = roundNumbers.size > 1

  for (const s of reconData.value.scrambles) {
    const label = hasMultipleRounds
      ? `R${s.roundNumber}-${s.number}`
      : t('wca.recon.attempt', { n: s.number })
    tabs.push({
      roundNumber: s.roundNumber!,
      scrambleNumber: s.number,
      label,
      hash: `r${s.roundNumber}-a${s.number}`,
      scramble: s,
    })
  }

  for (const rn of roundNumbers) {
    const numAttempts = reconData.value.attemptsPerRound?.[rn] ?? 3
    for (let i = 1; i <= numAttempts; i++) {
      if (!tabs.some(tab => tab.roundNumber === rn && tab.scrambleNumber === i)) {
        const label = hasMultipleRounds
          ? `R${rn}-${i}`
          : t('wca.recon.attempt', { n: i })
        tabs.push({
          roundNumber: rn,
          scrambleNumber: i,
          label,
          hash: `r${rn}-a${i}`,
        })
      }
    }
  }

  return tabs.sort((a, b) => a.roundNumber - b.roundNumber || a.scrambleNumber - b.scrambleNumber)
})

function getIsParticipant(userId: number): boolean {
  return reconByUserId.value[userId]?.isParticipant ?? false
}
function getUserAttemptMoves(roundNumber: number, scrambleNumber: number): number | null {
  return reconData.value?.currentUser?.attempts[`${roundNumber}-${scrambleNumber}`] ?? null
}
function getSingleRecord(userId: number, roundNumber: number, moves: number): string | null {
  const recon = reconByUserId.value[userId]
  const result = recon?.wcaData?.officialResults?.find(r => r.roundNumber === roundNumber)
  if (result && result.regionalSingleRecord && moves / 100 === result.best)
    return result.regionalSingleRecord
  return null
}

async function syncWcaData() {
  if (syncingWcaData.value)
    return

  syncingWcaData.value = true
  syncWcaDataError.value = ''
  syncWcaDataQueued.value = false
  try {
    await useClientApi(`wca/reconstruction/${wcaCompetitionId.value}/sync-wca-data`, {
      method: 'POST',
    })
    syncWcaDataQueued.value = true
    await refreshReconData()
  }
  catch (e: any) {
    syncWcaDataError.value = e?.data?.message || e?.message || t('wca.recon.syncFailed')
  }
  finally {
    syncingWcaData.value = false
  }
}
</script>

<template>
  <div>
    <h1 class="text-3xl font-bold my-2">
      {{ displayName }}
    </h1>
    <div v-if="wcaCompetition" class="text-sm text-gray-400 mb-2">
      {{ wcaCompetition.start_date }} ~ {{ wcaCompetition.end_date }}
    </div>
    <div class="flex items-center gap-2 text-sm my-2">
      <a :href="`https://www.worldcubeassociation.org/competitions/${wcaCompetitionId}/results/all?event=333fm`" target="_blank" class="text-blue-500 flex items-center gap-1">
        <WcaLogo class="w-4 h-4" />
        WCA 官方成绩
      </a>
    </div>

    <div v-if="reconData">
      <div v-if="reconData.isPublished" class="flex items-center gap-1.5 text-sm text-green-700 bg-green-50 p-2 border-l-4 border-green-500 mb-2">
        <Icon name="heroicons:check-badge-16-solid" />
        {{ t('wca.recon.resultsPublished') }}
      </div>

      <div
        v-if="user.signedIn && reconData.currentUser"
        class="text-sm p-2 border-l-4 mb-2"
        :class="reconData.currentUser.isParticipant ? 'text-green-700 bg-green-50 border-green-500' : 'text-gray-600 bg-gray-50 border-gray-300'"
      >
        <template v-if="reconData.currentUser.isParticipant">
          <Icon name="heroicons:check-circle-16-solid" class="text-green-500" />
          {{ t('wca.recon.participantDetected') }}
        </template>
        <template v-else>
          <Icon name="heroicons:information-circle-16-solid" class="text-gray-400" />
          {{ t('wca.recon.nonParticipantDetected') }}
        </template>
      </div>

      <WcaReconstructionDescriptionForm
        v-if="user.signedIn && hasStarted"
        :wca-competition-id="wcaCompetitionId"
        :existing-description="myRecon?.description"
        @updated="refreshReconData()"
      />

      <div v-if="reconData.recons.length > 0" class="flex items-center gap-2 my-3">
        <div class="inline-flex rounded-lg bg-gray-100 p-0.5 text-sm">
          <span class="px-3 py-1 rounded-md bg-indigo-500 text-white font-medium flex items-center gap-1">
            <Icon name="heroicons:queue-list-16-solid" />
            {{ t('wca.recon.viewByScramble') }}
          </span>
          <NuxtLink
            :to="`/wca/reconstruction/${wcaCompetitionId}/persons`"
            class="px-3 py-1 rounded-md text-gray-600 hover:text-gray-900 flex items-center gap-1"
          >
            <Icon name="heroicons:users-16-solid" />
            {{ t('wca.recon.viewByPerson') }} ({{ reconData.recons.length }})
          </NuxtLink>
        </div>
        <NuxtLink
          v-if="myRecon"
          :to="`/wca/reconstruction/${wcaCompetitionId}/${myRecon.user.wcaId || myRecon.user.id}`"
          class="text-indigo-500 text-sm flex items-center gap-1 hover:underline ml-2"
        >
          <Icon name="heroicons:user-circle-16-solid" />
          {{ t('wca.recon.myReconForComp') }}
        </NuxtLink>
      </div>

      <div class="flex flex-wrap items-center justify-end gap-2 my-2">
        <button
          class="inline-flex items-center gap-1 px-1 py-0.5 text-xs text-gray-500 hover:text-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          :disabled="syncingWcaData"
          @click="syncWcaData"
        >
          <Spinner v-if="syncingWcaData" class="w-3 h-3 text-gray-500 border-2" />
          <Icon v-else name="heroicons:arrow-path-16-solid" />
          {{ syncingWcaData ? t('wca.recon.syncingWcaData') : t('wca.recon.syncWcaData') }}
        </button>
        <span v-if="syncWcaDataQueued" class="text-xs text-green-600">
          {{ t('wca.recon.syncQueued') }}
        </span>
        <span v-if="syncWcaDataError" class="text-xs text-red-600">
          {{ syncWcaDataError }}
        </span>
      </div>

      <Tabs>
        <Tab
          v-for="tab in scrambleTabs"
          :key="tab.hash"
          :name="tab.label"
          :hash="tab.hash"
        >
          <ScrambleDisplay v-if="tab.scramble" :scramble="tab.scramble.scramble" />

          <div v-if="getUserAttemptMoves(tab.roundNumber, tab.scrambleNumber) != null" class="text-xs flex items-center gap-1 my-1">
            <template v-if="getUserAttemptMoves(tab.roundNumber, tab.scrambleNumber)! > 0">
              <Icon name="heroicons:check-circle-16-solid" class="text-green-500" />
              {{ t('wca.recon.yourOfficialResult', { moves: getUserAttemptMoves(tab.roundNumber, tab.scrambleNumber) }) }}
            </template>
            <template v-else>
              <Icon name="heroicons:x-circle-16-solid" class="text-red-500" />
              {{ t('wca.recon.yourOfficialResultDnf') }}
            </template>
          </div>

          <WcaReconstructionForm
            v-if="user.signedIn && hasStarted"
            :wca-competition-id="wcaCompetitionId"
            :round-number="tab.roundNumber"
            :scramble-number="tab.scrambleNumber"
            :existing-scramble="tab.scramble?.scramble"
            :scramble-disabled="reconData.hasOfficialScrambles && !!tab.scramble"
            :existing-solution="tab.scramble ? mySubmissions[tab.scramble.id]?.[0] : undefined"
            :user-attempt-moves="getUserAttemptMoves(tab.roundNumber, tab.scrambleNumber)"
            @submitted="refreshReconData()"
          />

          <div v-if="tab.scramble">
            <Submissions
              :submissions="reconData.submissions[tab.scramble.id] ?? []"
              :competition="reconData.competition ?? undefined"
              :scramble="tab.scramble"
              sortable
            >
              <template #extra="submission">
                <span v-if="getIsParticipant(submission.userId)" class="bg-green-500 text-white px-1 rounded text-xs">{{ t('wca.recon.participant') }}</span>
                <span v-else class="bg-gray-400 text-white px-1 rounded text-xs">{{ t('wca.recon.unofficial') }}</span>
                <WcaRecordBadge :record="getSingleRecord(submission.userId, tab.roundNumber, submission.moves)" />
              </template>
            </Submissions>
            <div v-if="reconData.submissions[tab.scramble.id]?.length === 0" class="text-sm text-gray-400 italic py-4">
              {{ t('wca.recon.noRecons') }}
            </div>
          </div>
          <div v-else class="text-sm text-gray-400 italic py-4">
            {{ t('wca.recon.noRecons') }}
          </div>
        </Tab>
      </Tabs>
    </div>
  </div>
</template>
