<script setup lang="ts">
const { t } = useI18n()
const route = useRoute()
const wcaCompetition = inject(SYMBOL_WCA_COMPETITION)
const wcaCompetitionId = computed(() => route.params.id as string)

const { data: reconData } = await useApi<WcaReconstructionCompetitionData>(`wca/reconstruction/${wcaCompetitionId.value}`)

const displayName = computed(() => wcaCompetition?.value?.name ?? wcaCompetitionId.value)

const submissionCountByUser = computed(() => {
  const map: Record<number, number> = {}
  for (const submissions of Object.values(reconData.value?.submissions ?? {})) {
    for (const s of submissions) {
      map[s.userId] = (map[s.userId] ?? 0) + 1
    }
  }
  return map
})

const sortedRecons = computed(() => {
  if (!reconData.value)
    return []
  return [...reconData.value.recons].sort((a, b) => {
    if (a.isParticipant !== b.isParticipant)
      return a.isParticipant ? -1 : 1
    return (submissionCountByUser.value[b.userId] ?? 0) - (submissionCountByUser.value[a.userId] ?? 0)
  })
})

function sortedResults(recon: WcaReconstruction) {
  return (recon.wcaData?.officialResults ?? []).slice().sort((a, b) => a.roundNumber - b.roundNumber)
}

useSeoMeta({
  title: computed(() => `${t('wca.recon.viewByPerson')} - ${t('wca.recon.title')} - ${displayName.value}`),
})
</script>

<template>
  <div>
    <h1 class="text-3xl font-bold my-2">
      {{ displayName }}
    </h1>
    <div v-if="wcaCompetition" class="text-sm text-gray-400 mb-2">
      {{ wcaCompetition.start_date }} ~ {{ wcaCompetition.end_date }}
    </div>

    <div class="flex items-center gap-2 my-3">
      <div class="inline-flex rounded-lg bg-gray-100 p-0.5 text-sm">
        <NuxtLink
          :to="`/wca/reconstruction/${wcaCompetitionId}`"
          class="px-3 py-1 rounded-md text-gray-600 hover:text-gray-900 flex items-center gap-1"
        >
          <Icon name="heroicons:queue-list-16-solid" />
          {{ t('wca.recon.viewByScramble') }}
        </NuxtLink>
        <span class="px-3 py-1 rounded-md bg-indigo-500 text-white font-medium flex items-center gap-1">
          <Icon name="heroicons:users-16-solid" />
          {{ t('wca.recon.viewByPerson') }} ({{ sortedRecons.length }})
        </span>
      </div>
    </div>

    <div v-if="reconData">
      <div v-if="sortedRecons.length === 0" class="text-sm text-gray-400 italic py-4">
        {{ t('wca.recon.noRecons') }}
      </div>
      <NuxtLink
        v-for="recon in sortedRecons"
        :key="recon.id"
        :to="`/wca/reconstruction/${wcaCompetitionId}/${recon.user.wcaId || recon.user.id}`"
        class="block border-t first:border-t-0 border-gray-300 py-3 px-2 hover:bg-gray-50"
      >
        <div class="flex items-center gap-2">
          <img :src="recon.user.avatarThumb || '/images/default-avatar.png'" class="w-8 h-8 shrink-0" :title="recon.user.name">
          <span class="text-blue-500 font-medium truncate">{{ recon.user.name }}</span>
          <span v-if="!recon.isParticipant" class="shrink-0 text-gray-400 bg-gray-100 px-1 rounded text-xs">{{ t('wca.recon.unofficial') }}</span>
          <span class="ml-auto shrink-0 text-xs text-gray-400">{{ t('wca.recon.reconCount', { count: submissionCountByUser[recon.userId] ?? 0 }) }}</span>
        </div>
        <div v-if="sortedResults(recon).length > 0" class="mt-1 pl-10 flex flex-wrap gap-x-4 gap-y-0.5">
          <div v-for="r in sortedResults(recon)" :key="r.roundTypeId" class="flex items-center gap-1.5 text-xs">
            <span class="text-gray-400">{{ t(`result.roundType.${r.roundTypeId}`) }}</span>
            <span class="font-mono text-gray-600">#{{ r.pos }}</span>
            <span class="font-mono font-bold" :class="r.average === WCA_DNF ? 'text-red-500' : 'text-gray-700'">{{ formatWCAResult(r.average, 2, 100) }}</span>
            <WcaRecordBadge :record="r.regionalAverageRecord" />
            <span class="font-mono" :class="r.best === WCA_DNF ? 'text-red-500' : 'text-gray-500'">{{ formatWCAResult(r.best) }}</span>
            <WcaRecordBadge :record="r.regionalSingleRecord" />
            <span class="font-mono text-gray-400">({{ r.attempts.filter(v => v !== 0).map(v => formatWCAResult(v)).join(' ') }})</span>
          </div>
        </div>
        <div v-if="recon.description" class="mt-0.5 text-xs text-gray-400 truncate pl-10">
          {{ recon.description }}
        </div>
      </NuxtLink>
    </div>
  </div>
</template>
