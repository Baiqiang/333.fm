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

  if (tabs.length === 0) {
    for (let i = 1; i <= 3; i++) {
      tabs.push({
        roundNumber: 1,
        scrambleNumber: i,
        label: t('wca.recon.attempt', { n: i }),
        hash: `r1-a${i}`,
      })
    }
  }

  return tabs.sort((a, b) => a.roundNumber - b.roundNumber || a.scrambleNumber - b.scrambleNumber)
})

function getSubmissionsForScramble(scrambleId: number) {
  if (!reconData.value)
    return []
  return reconData.value.submissions
    .filter(s => s.scrambleId === scrambleId)
    .sort((a, b) => a.moves - b.moves)
}

function getIsParticipant(userId: number): boolean {
  return reconByUserId.value[userId]?.isParticipant ?? false
}

function getMyExistingSubmission(scrambleId: number) {
  if (!reconData.value)
    return undefined
  return reconData.value.submissions.find(s => s.scrambleId === scrambleId && s.userId === user.id)
}

function getUserAttemptMoves(roundNumber: number, scrambleNumber: number): number | null {
  return reconData.value?.currentUser?.attempts[`${roundNumber}-${scrambleNumber}`] ?? null
}
</script>

<template>
  <div>
    <h1 class="text-3xl font-bold my-2">
      {{ displayName }}
    </h1>

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

      <Tabs>
        <Tab
          v-for="tab in scrambleTabs"
          :key="tab.hash"
          :name="tab.label"
          :hash="tab.hash"
        >
          <StickyScramble v-if="tab.scramble" :scramble="tab.scramble.scramble" />
          <CubeExpanded v-if="tab.scramble" :moves="tab.scramble.scramble" />

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
            :existing-solution="tab.scramble ? getMyExistingSubmission(tab.scramble.id) : undefined"
            :user-attempt-moves="getUserAttemptMoves(tab.roundNumber, tab.scrambleNumber)"
            @submitted="refreshReconData()"
          />

          <div v-if="tab.scramble">
            <Submissions
              :submissions="getSubmissionsForScramble(tab.scramble.id)"
              :competition="reconData.competition ?? undefined"
              sortable
            >
              <template #extra="submission">
                <span v-if="getIsParticipant(submission.userId)" class="bg-green-500 text-white px-1 rounded text-xs">{{ t('wca.recon.participant') }}</span>
                <span v-else class="bg-gray-400 text-white px-1 rounded text-xs">{{ t('wca.recon.unofficial') }}</span>
              </template>
            </Submissions>
            <div v-if="getSubmissionsForScramble(tab.scramble.id).length === 0" class="text-sm text-gray-400 italic py-4">
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
