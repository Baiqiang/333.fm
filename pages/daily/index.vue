<script setup lang="ts">
const { data: onGoing } = await useApi<Competition>('/daily/on-going')
const { data: past } = await useApi<Pagination<PastCompetition>>('/daily')
console.log(past, onGoing)
const { t } = useI18n()
useSeoMeta({
  title: t('daily.title'),
})
</script>

<template>
  <div class="grid grid-cols-12 gap-2">
    <div v-if="onGoing" class="col-span-12 md:col-span-9">
      <h1 class="font-bold text-lg md:text-3xl my-2">
        {{ onGoing.name }}
      </h1>
      <WeeklySummary :competition="onGoing" />
    </div>
    <div v-else class="col-span-12 md:col-span-9">
      <div class="font-semibold my-4">
        {{ $t('daily.pending') }}
      </div>
      <div class="text-sm">
        {{ $t('daily.creation') }}
      </div>
      <NuxtLink to="/practice/new" class="bg-indigo-500 text-white px-3 py-2 mb-2 inline-flex items-center gap-1">
        <Icon name="ic:twotone-plus" />
        {{ t('common.new') }}
      </NuxtLink>
    </div>
    <div v-if="past!.items.length > 0" class="col-span-12 md:col-span-3">
      <h2 class="font-bold text-lg md:text-2xl my-2">
        {{ $t('daily.past') }}
      </h2>
      <DailyWinner v-for="competition in past?.items" :key="competition.id" :competition="competition" />
    </div>
  </div>
</template>
