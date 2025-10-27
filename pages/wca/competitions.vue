<script setup lang="ts">
const config = useRuntimeConfig().public
const dayjs = useDayjs()
const { t } = useI18n()

const query = reactive<WCACompetitionsQuery>({
  q: '',
  // default to 31 days ago
  start: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000),
  end: new Date(),
  sort: '-end_date,-start_date,name',
  page: 1,
})

const competitions = ref<WCACompetition[]>([])
const loading = ref(true)
const wcaCompetitionsCache = useWCACompetitionsCache()

onMounted(async () => {
  competitions.value = await fetchCompetitions(query)
})

watch(query, async () => {
  competitions.value = await fetchCompetitions(query)
})

async function fetchCompetitions(query: WCACompetitionsQuery) {
  try {
    loading.value = true
    const data = await $fetch<WCACompetition[]>(`${config.wca.apiBaseURL}/competition_index`, {
      query: {
        'event_ids[]': '333fm',
        ...query,
        'start': query.start ? dayjs(query.start).format('YYYY-MM-DD') : undefined,
        'end': query.end ? dayjs(query.end).format('YYYY-MM-DD') : undefined,
      },
    })
    loading.value = false
    wcaCompetitionsCache.setCompetitions(data)
    return data
  }
  catch (e) {
    console.error(e)
    loading.value = false
    return []
  }
}

useSeoMeta({
  title: t('wca.competitions'),
})
</script>

<template>
  <div>
    <div class="flex flex-col md:flex-row gap-2 mb-4 mt-2 flex-wrap">
      <div class="">
        <input
          id="wca-q"
          v-model="query.q"
          class="border rounded-sm px-2 py-1"
          placeholder="Competition name..."
          type="text"
        >
      </div>
      <div class="flex gap-1">
        <FormDateInput
          id="wca-start"
          v-model="query.start"
          class="border rounded-sm px-2 py-1 flex-1"
          type="date"
          placeholder="Start date"
        />
        ~
        <FormDateInput
          id="wca-end"
          v-model="query.end"
          class="border rounded-sm px-2 py-1 flex-1"
          type="date"
          placeholder="End date"
        />
      </div>
    </div>
    <Loading v-if="loading" />
    <div v-else class="space-y-6">
      <div v-for="competition in competitions" :key="competition.id" class="p-4 border shadow-sm bg-white flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <div class="font-semibold text-lg">
            <NuxtLink :to="`/wca/competition/${competition.id}`" class="hover:underline text-blue-700">
              {{ competition.name }}
            </NuxtLink>
          </div>
          <div class="text-gray-600 text-sm">
            {{ competition.city }}, {{ competition.country_iso2 }}
            <span v-if="competition.venue">
              {{ competition.venue }}
              — <MDC :value="competition.venue" tag="span" />

            </span>
          </div>
          <div class="text-gray-500 text-xs mt-1">
            {{ dayjs(competition.start_date).format('MMM D, YYYY') }} - {{ dayjs(competition.end_date).format('MMM D, YYYY') }}
          </div>
        </div>
        <div class="mt-2 md:mt-0 flex-shrink-0">
          <NuxtLink
            :to="`https://www.worldcubeassociation.org/competitions/${competition.id}`"
            target="_blank"
            class=""
          >
            <WcaLogo class="w-6" />
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>
