<script setup lang="ts">
interface PersonalRecords {
  competitionRecords: {
    type: 'weekly' | 'daily' | 'practice'
    record: CompetitionRecord
  }[]
  endlessRecords: EndlessRecord[]
  submissionsCount: {
    type: CompetitionType
    count: string
    competitionCount: string
    scrambleCount: string
  }[]
}

const route = useRoute()
const { t } = useI18n()
const { data, error } = await useApi<User>(`/profile/${route.params.id}`)
if (error.value || !data.value) {
  throw createError({
    statusCode: error.value?.statusCode ?? 404,
  })
}
const { data: data2 } = await useApi<PersonalRecords>(`/profile/${route.params.id}/records`)
const records = ref<PersonalRecords>(data2.value!)
const user = ref<User>(data.value)
provide(SYMBOL_USER, user)
const filters = computed(() => {
  const base = `/profile/${userId(user.value)}`
  let total = 0
  const countsMap = records.value.submissionsCount.reduce((acc, curr) => {
    acc[curr.type] = curr
    total += Number(curr.count)
    return acc
  }, {} as Record<CompetitionType, { count: string, competitionCount: string, scrambleCount: string }>)
  const typesMap = {
    weekly: CompetitionType.WEEKLY,
    daily: CompetitionType.DAILY,
    practice: CompetitionType.PERSONAL_PRACTICE,
  }
  const ret: { type: string, to: string, label: string, count: string }[] = [
    {
      type: 'all',
      to: base,
      label: t('common.all'),
      count: total.toString(),
    },
  ]
  for (const { type } of records.value.competitionRecords) {
    let count = countsMap[typesMap[type]]?.count
    if (type === 'weekly') {
      count += `/${countsMap[CompetitionType.WEEKLY]?.competitionCount}`
    }
    ret.push({
      type,
      to: `${base}/${type}`,
      label: t(`result.type.${type}`),
      count,
    })
  }
  if (records.value.endlessRecords.length) {
    ret.push({
      type: 'endless',
      to: `${base}/endless`,
      label: t('endless.title'),
      count: countsMap[CompetitionType.ENDLESS]?.count,
    })
  }
  if (user.value.wcaId) {
    ret.push({
      type: 'wca',
      to: `${base}/wca`,
      label: 'WCA',
      count: '',
    })
  }
  return ret
})
useSeoMeta({
  title: user.value.name,
})
</script>

<template>
  <div>
    <div class="flex items-center gap-2 my-4">
      <h2 class="font-bold text-2xl">
        {{ user.name }}
      </h2>
      <a v-if="user.wcaId" :href="`https://www.worldcubeassociation.org/persons/${user.wcaId}`" target="_blank" class="text-blue-500">
        <WcaLogo class="w-6" />
      </a>
    </div>
    <h3 class="my-4 font-bold text-xl">
      {{ $t('profile.pr') }}
    </h3>
    <div v-if="filters.length === 0">
      {{ $t('profile.noRecord') }}
    </div>
    <div v-else class="grid grid-cols-[max-content_max-content_max-content_1fr] gap-2">
      <div v-if="records.competitionRecords.length" class="col-span-full grid grid-cols-subgrid pb-2 border-b border-gray-300 font-bold">
        <div class="pl-4">
          {{ $t('result.challenge') }}
        </div>
        <div class="text-right">
          {{ $t('result.single') }}
        </div>
        <div class="col-span-2">
          {{ $t('result.mean') }}
        </div>
      </div>
      <div v-for="{ type, record } in records.competitionRecords" :key="type" class="col-span-full grid grid-cols-subgrid pb-2 border-b border-gray-300">
        <div class=" pl-4">
          <NuxtLink :to="`/${type}`" class="text-blue-500">
            {{ $t(`result.type.${type}`) }}
          </NuxtLink>
        </div>
        <div class="text-right">
          <NuxtLink
            v-if="record.bestSingles.length === 1"
            :to="competitionPath(record.bestSingles[0].competition, {
              number: record.bestSingles[0].values.indexOf(record.single) + 1,
            })"
            class="text-blue-500"
          >
            {{ formatResult(record.single) }}
          </NuxtLink>
          <div v-else>
            {{ formatResult(record.single) }}
            <CompetitionName
              v-for="result in record.bestSingles"
              :key="result.competition.id"
              :competition="result.competition"
              :scramble="{ number: result.values.indexOf(record.single) + 1 }"
              class="text-blue-500 block text-xs"
            />
          </div>
        </div>
        <div class="col-span-2">
          <NuxtLink
            v-if="record.bestMeans.length === 1"
            :to="competitionPath(record.bestMeans[0].competition)"
            class="text-blue-500"
          >
            {{ formatResult(record.mean, 2) }}
          </NuxtLink>
          <div v-else>
            {{ formatResult(record.mean, 2) }}
            <CompetitionName
              v-for="result in record.bestMeans"
              :key="result.competition.id"
              :competition="result.competition"
              class="text-blue-500 block text-xs"
            />
          </div>
        </div>
      </div>
      <div v-if="records.endlessRecords.length" class="col-span-full grid grid-cols-subgrid pb-2 border-b border-gray-300 font-bold">
        <div class="pl-4">
          {{ $t('endless.title') }}
        </div>
        <div class="text-right">
          {{ $t('result.single') }}
        </div>
        <div class="">
          {{ $t('result.mean') }}
        </div>
        <div>
          {{ $t('endless.stats.level') }}
        </div>
      </div>
      <div v-for="{ single, mean, levels, competition } in records.endlessRecords" :key="competition.id" class="col-span-full grid grid-cols-subgrid pb-2 border-b border-gray-300">
        <div class="pl-4">
          <NuxtLink :to="competitionPath(competition)" class="text-blue-500">
            {{ competition.name }}
          </NuxtLink>
        </div>
        <div class="text-right">
          {{ formatResult(single) }}
        </div>
        <div>
          {{ formatResult(mean, 2) }}
        </div>
        <div>
          {{ levels }}
        </div>
      </div>
    </div>
    <div v-if="filters.length" class="flex flex-wrap gap-2 mt-2 text-xs md:text-base">
      <NuxtLink
        v-for="{ type, to, label, count } in filters"
        :key="type"
        :to="to"
        class="px-2 py-2 text-white whitespace-nowrap"
        :class="{
          'bg-indigo-500': !$route.path.endsWith(to),
          'bg-gray-500': $route.path.endsWith(to),
        }"
      >
        {{ label }}
        <span v-if="count" class="text-xs">
          ({{ count }})
        </span>
      </NuxtLink>
    </div>
    <NuxtPage />
  </div>
</template>
