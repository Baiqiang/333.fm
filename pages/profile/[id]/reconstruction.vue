<script setup lang="ts">
const { t } = useI18n()
const route = useRoute()
const dayjs = useDayjs()
const { locale } = useI18n()
const user = inject(SYMBOL_USER)!

const { data: items } = await useApi<WcaReconFeedItem[]>(`wca/reconstruction/user/${route.params.id}`)

function sortedResults(item: WcaReconFeedItem) {
  return (item.wcaData?.officialResults ?? []).slice().sort((a, b) => a.roundNumber - b.roundNumber)
}
</script>

<template>
  <div class="mt-4">
    <div v-if="!items || items.length === 0" class="text-sm text-gray-400 italic py-4">
      {{ t('wca.recon.noMyRecons') }}
    </div>
    <div v-else>
      <NuxtLink
        v-for="item in items"
        :key="item.id"
        :to="`/wca/reconstruction/${item.wcaCompetitionId}/${userId(user)}`"
        class="block border-t first:border-t-0 border-gray-300 py-3 px-2 hover:bg-gray-50"
      >
        <div class="flex items-center gap-2">
          <span class="text-blue-500 font-medium truncate">{{ item.competitionName }}</span>
          <span v-if="!item.isParticipant" class="shrink-0 text-gray-400 bg-gray-100 px-1 rounded text-xs">{{ t('wca.recon.unofficial') }}</span>
          <span class="ml-auto shrink-0 text-xs text-gray-400 whitespace-nowrap">
            {{ item.startTime ? dayjs(item.startTime).format('YYYY-MM-DD') : dayjs(item.updatedAt).locale(locale).fromNow() }}
          </span>
        </div>
        <div class="mt-0.5 text-xs text-gray-500">
          {{ t('wca.recon.submissions', { count: item.submissionCount }) }}
          <span v-if="item.description" class="text-gray-400 ml-1 truncate">· {{ item.description }}</span>
        </div>
        <div v-if="sortedResults(item).length > 0" class="mt-1 flex flex-wrap gap-x-4 gap-y-0.5">
          <div v-for="r in sortedResults(item)" :key="r.roundTypeId" class="flex items-center gap-1.5 text-xs">
            <span class="text-gray-400">{{ t(`result.roundType.${r.roundTypeId}`) }}</span>
            <span class="font-mono text-gray-600">#{{ r.pos }}</span>
            <span class="font-mono font-bold" :class="r.average === WCA_DNF ? 'text-red-500' : 'text-gray-700'">{{ formatWCAResult(r.average, 2, 100) }}</span>
            <WcaRecordBadge :record="r.regionalAverageRecord" />
            <span class="font-mono" :class="r.best === WCA_DNF ? 'text-red-500' : 'text-gray-500'">{{ formatWCAResult(r.best) }}</span>
            <WcaRecordBadge :record="r.regionalSingleRecord" />
            <span class="font-mono text-gray-400">({{ r.attempts.filter(v => v !== 0).map(v => formatWCAResult(v)).join(' ') }})</span>
          </div>
        </div>
      </NuxtLink>
    </div>
  </div>
</template>
