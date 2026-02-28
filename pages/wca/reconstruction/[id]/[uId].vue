<script setup lang="ts">
const { t } = useI18n()
const route = useRoute()
const wcaCompetition = inject(SYMBOL_WCA_COMPETITION)
const wcaCompetitionId = computed(() => route.params.id as string)
const uId = computed(() => route.params.uId as string)

const { data, refresh } = await useApi<WcaReconUserData>(`wca/reconstruction/${wcaCompetitionId.value}/user/${uId.value}`)

const bus = useEventBus('submission')
bus.on(() => refresh())

const recon = computed(() => data.value?.recon ?? null)
const competition = computed(() => data.value?.competition ?? undefined)
const officialResults = computed(() => data.value?.officialResults ?? [])

const officialByRound = computed(() => {
  const map: Record<number, WcaOfficialRoundResult> = {}
  for (const r of officialResults.value) map[r.roundNumber] = r
  return map
})

interface RoundGroup {
  roundNumber: number
  official: WcaOfficialRoundResult | null
  submissions: Submission[]
}

const rounds = computed<RoundGroup[]>(() => {
  if (!data.value)
    return []
  const subs = data.value.submissions
  const roundNums = new Set<number>()
  for (const s of subs) roundNums.add(s.scramble?.roundNumber ?? 1)
  for (const r of officialResults.value) roundNums.add(r.roundNumber)

  return [...roundNums].sort((a, b) => a - b).map(rn => ({
    roundNumber: rn,
    official: officialByRound.value[rn] ?? null,
    submissions: subs
      .filter(s => (s.scramble?.roundNumber ?? 1) === rn)
      .sort((a, b) => (a.scramble?.number ?? 0) - (b.scramble?.number ?? 0)),
  }))
})

const displayName = computed(() => wcaCompetition?.value?.name ?? wcaCompetitionId.value)

function attemptLabel(sub: Submission): string {
  const sn = sub.scramble?.number ?? 1
  return t('wca.recon.attempt', { n: sn })
}

useSeoMeta({
  title: computed(() => {
    const name = recon.value?.user.name ?? uId.value
    return `${name} - ${t('wca.recon.title')} - ${displayName.value}`
  }),
})
</script>

<template>
  <div>
    <div v-if="recon">
      <h1 class="text-3xl font-bold my-2">
        {{ displayName }}
      </h1>

      <div class="flex items-center gap-3 my-3 text-sm">
        <NuxtLink
          :to="`/wca/reconstruction/${wcaCompetitionId}`"
          class="text-indigo-500 flex items-center gap-1 hover:underline"
        >
          <Icon name="heroicons:queue-list-16-solid" />
          {{ t('wca.recon.viewByScramble') }}
        </NuxtLink>
        <NuxtLink
          :to="`/wca/reconstruction/${wcaCompetitionId}/persons`"
          class="text-indigo-500 flex items-center gap-1 hover:underline"
        >
          <Icon name="heroicons:users-16-solid" />
          {{ t('wca.recon.viewByPerson') }}
        </NuxtLink>
      </div>

      <NuxtLink :to="`/profile/${recon.user.wcaId || recon.user.id}`" class="flex gap-3 items-center py-3">
        <img :src="recon.user.avatarThumb || '/images/default-avatar.png'" class="w-12 h-12" :title="recon.user.name">
        <div>
          <div class="text-blue-500 font-semibold text-lg">
            {{ recon.user.name }}
          </div>
          <div class="text-gray-400 text-xs flex items-center gap-2">
            <span v-if="recon.isParticipant" class="text-green-600">{{ t('wca.recon.participantDetected') }}</span>
            <span v-else>{{ t('wca.recon.unofficial') }}</span>
          </div>
        </div>
      </NuxtLink>

      <div v-if="recon.description" class="text-sm text-gray-700 bg-gray-50 p-3 border-l-4 border-indigo-300 mb-6">
        <ClientOnly>
          <MdPreview :content="recon.description" />
          <template #fallback>
            <div class="whitespace-pre-wrap">
              {{ recon.description }}
            </div>
          </template>
        </ClientOnly>
      </div>

      <div v-for="round in rounds" :key="round.roundNumber" class="mb-6">
        <div v-if="round.official" class="mb-3">
          <div class="flex items-center gap-2 mb-1.5">
            <span class="text-base font-semibold text-gray-800">{{ t(`result.roundType.${round.official.roundTypeId}`) }}</span>
            <WcaRecordBadges :single="round.official.regionalSingleRecord" :average="round.official.regionalAverageRecord" />
          </div>
          <div class="flex flex-wrap items-baseline gap-x-5 gap-y-1 text-sm">
            <div>
              <span class="text-gray-400 text-xs">{{ t('result.rank') }}</span>
              <span class="ml-1 font-mono font-semibold text-gray-700">#{{ round.official.pos }}</span>
            </div>
            <div>
              <span class="text-gray-400 text-xs">{{ t('result.mean') }}</span>
              <span class="ml-1 font-mono font-bold" :class="round.official.average === WCA_DNF ? 'text-red-500' : 'text-gray-800'">{{ formatWCAResult(round.official.average, 2, 100) }}</span>
            </div>
            <div>
              <span class="text-gray-400 text-xs">{{ t('result.single') }}</span>
              <span class="ml-1 font-mono" :class="round.official.best === WCA_DNF ? 'text-red-500' : 'text-gray-700'">{{ formatWCAResult(round.official.best) }}</span>
            </div>
            <div class="text-gray-400 font-mono text-xs">
              {{ round.official.attempts.filter(v => v !== 0).map(v => formatWCAResult(v)).join(' / ') }}
            </div>
          </div>
        </div>
        <div v-else-if="rounds.length > 1" class="text-base font-semibold text-gray-800 mb-3">
          Round {{ round.roundNumber }}
        </div>

        <div
          v-for="(sub, idx) in round.submissions"
          :key="sub.id"
          class="py-4"
          :class="{ 'border-t-2 border-gray-200': idx > 0 }"
        >
          <div class="text-sm font-semibold text-gray-600 mb-2 flex items-center gap-1.5">
            {{ attemptLabel(sub) }}
            <template v-if="sub.scramble?.verified">
              <Icon name="heroicons:shield-check-16-solid" class="text-green-500" size="14" />
            </template>
          </div>

          <div v-if="sub.scramble" class="mb-2">
            <div class="text-xs text-gray-400 mb-0.5">
              {{ t('wca.recon.scramble') }}
            </div>
            <Sequence :sequence="sub.scramble.scramble" :source="sub.scramble.scramble" class="font-mono" />
          </div>

          <Submission
            :submission="sub"
            :competition="competition"
            always-expanded
          />
        </div>

        <div v-if="round.submissions.length === 0" class="text-sm text-gray-400 italic py-2">
          {{ t('wca.recon.noSolutions') }}
        </div>
      </div>

      <div v-if="rounds.length === 0" class="text-sm text-gray-400 italic py-4">
        {{ t('wca.recon.noSolutions') }}
      </div>
    </div>
    <div v-else class="text-sm text-gray-400 italic py-4">
      {{ t('wca.recon.noRecons') }}
    </div>
  </div>
</template>
