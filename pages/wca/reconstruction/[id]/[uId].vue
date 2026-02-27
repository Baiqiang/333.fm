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

const sortedSubmissions = computed(() => {
  if (!data.value)
    return []
  return [...data.value.submissions].sort((a, b) => {
    const ra = a.scramble?.roundNumber ?? 0
    const rb = b.scramble?.roundNumber ?? 0
    if (ra !== rb)
      return ra - rb
    return (a.scramble?.number ?? 0) - (b.scramble?.number ?? 0)
  })
})

const displayName = computed(() => wcaCompetition?.value?.name ?? wcaCompetitionId.value)

function attemptLabel(sub: Submission): string {
  const rn = sub.scramble?.roundNumber ?? 1
  const sn = sub.scramble?.number ?? 1
  return `R${rn}-A${sn}`
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

      <div
        v-for="(sub, idx) in sortedSubmissions"
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

      <div v-if="sortedSubmissions.length === 0" class="text-sm text-gray-400 italic py-4">
        {{ t('wca.recon.noSolutions') }}
      </div>
    </div>
    <div v-else class="text-sm text-gray-400 italic py-4">
      {{ t('wca.recon.noRecons') }}
    </div>
  </div>
</template>
