<script setup lang="ts">
const { data: onGoing } = await useApi<Competition>('/fun-challenges/on-going')
const { data: past } = await useApi<Pagination<PastCompetition>>('/fun-challenges')
const { t } = useI18n()
useSeoMeta({
  title: t('funChallenge.title'),
})
</script>

<template>
  <div class="grid grid-cols-12 gap-2">
    <div v-if="onGoing" class="col-span-12 md:col-span-9">
      <Heading1>
        {{ onGoing.name }}
      </Heading1>
      <WeeklySummary :competition="onGoing" />
    </div>
    <div v-else class="col-span-12 md:col-span-9">
      <Heading1>
        {{ $t('funChallenge.title') }}
      </Heading1>
      <div class="font-semibold my-4">
        {{ $t('funChallenge.pending') }}
      </div>
    </div>
    <div v-if="past!.items.length > 0" class="col-span-12 md:col-span-3">
      <h2 class="font-bold text-lg md:text-2xl my-2">
        {{ $t('funChallenge.past') }}
      </h2>
      <DailyWinner v-for="competition in past?.items" :key="competition.id" :competition="competition" />
    </div>
  </div>
</template>
