<script setup lang="ts">
const { t } = useI18n()
const dayjs = useDayjs()
const { locale } = useI18n()
const route = useRoute()

const items = ref<WcaReconFeedItem[]>([])
const meta = usePaginationMeta()

await fetchData()

async function fetchData() {
  const { data } = await useApi<Pagination<WcaReconFeedItem>>('wca/reconstruction', {
    params: {
      page: route.query.page,
      limit: 100,
    },
  })
  items.value = data.value?.items ?? []
  meta.value = data.value!.meta
}

function sortedResults(item: WcaReconFeedItem) {
  return (item.wcaData?.officialResults ?? []).slice().sort((a, b) => a.roundNumber - b.roundNumber)
}

useSeoMeta({
  title: computed(() => t('wca.recon.latestRecons')),
})
</script>

<template>
  <div>
    <div class="flex items-center justify-between gap-4 my-2">
      <h1 class="text-3xl font-bold">
        {{ t('wca.recon.latestRecons') }}
      </h1>
      <NuxtLink
        to="/wca/competitions"
        class="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium shadow-sm transition-colors"
      >
        <Icon name="heroicons:plus-16-solid" />
        {{ t('wca.recon.submitRecon') }}
      </NuxtLink>
    </div>

    <div v-if="items.length === 0" class="text-sm text-gray-400 italic py-4">
      {{ t('wca.recon.noRecons') }}
    </div>
    <div v-else>
      <NuxtLink
        v-for="item in items"
        :key="item.id"
        :to="`/wca/reconstruction/${item.wcaCompetitionId}/${item.user.wcaId || item.user.id}`"
        class="block border-t first:border-t-0 border-gray-300 py-3 px-2 hover:bg-gray-50"
      >
        <div class="flex items-center gap-2">
          <img :src="item.user.avatarThumb || '/images/default-avatar.png'" class="w-7 h-7 shrink-0">
          <span class="text-blue-500 font-medium truncate">{{ item.user.name }}</span>
          <span v-if="!item.isParticipant" class="shrink-0 text-gray-400 bg-gray-100 px-1 rounded text-xs">{{ t('wca.recon.unofficial') }}</span>
          <span class="ml-auto shrink-0 text-xs text-gray-400">{{ dayjs(item.updatedAt).locale(locale).fromNow() }}</span>
        </div>
        <div class="mt-0.5 text-xs text-gray-500 truncate pl-9">
          {{ item.competitionName }}
          <span class="text-gray-400 ml-1">· {{ t('wca.recon.submissions', { count: item.submissionCount }) }}</span>
        </div>
        <div v-if="sortedResults(item).length > 0" class="mt-1 pl-9 flex flex-wrap gap-x-4 gap-y-0.5">
          <div v-for="r in sortedResults(item)" :key="r.roundTypeId" class="flex items-center gap-1.5 text-xs">
            <span class="text-gray-400">{{ t(`result.roundType.${r.roundTypeId}`) }}</span>
            <span class="font-mono text-gray-600">#{{ r.pos }}</span>
            <span class="font-mono font-bold" :class="r.average === WCA_DNF ? 'text-red-500' : 'text-gray-700'">{{ formatWCAResult(r.average, 2, 100) }}</span>
            <span class="font-mono text-gray-400">({{ r.attempts.filter(v => v !== 0).map(v => formatWCAResult(v)).join(' ') }})</span>
            <WcaRecordBadges :single="r.regionalSingleRecord" :average="r.regionalAverageRecord" />
          </div>
        </div>
        <div v-if="item.description" class="mt-0.5 text-xs text-gray-400 truncate pl-9">
          {{ item.description }}
        </div>
      </NuxtLink>
    </div>
    <Pagination :meta="meta" @update="fetchData" />
  </div>
</template>
