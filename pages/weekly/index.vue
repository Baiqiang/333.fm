<script setup lang="ts">
const { data: onGoing } = await useApi<Competition>('/weekly/on-going')
const { data: past } = await useApi<Pagination<PastCompetition>>('/weekly')
console.log(past, onGoing)
const { t } = useI18n()
useSeoMeta({
  title: t('weekly.title'),
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
    <div v-if="past!.items.length > 0" class="col-span-12 md:col-span-3">
      <h2 class="font-bold text-lg md:text-2xl my-2">
        {{ $t('weekly.past') }}
      </h2>
      <WeeklyWinner v-for="competition in past?.items" :key="competition.id" :competition="competition" />
    </div>
  </div>
</template>
