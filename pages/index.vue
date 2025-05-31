<script setup lang="ts">
const { t } = useI18n()
useSeoMeta({
  title: `${t('title')} - 333.fm`,
  titleTemplate: null,
})
const { data: finders } = await useApi<InsertionFinder[]>('/if/latest')
if (!finders.value)
  finders.value = []
const { data: weekly } = await useApi<Competition>('/weekly/on-going')
const { data: daily } = await useApi<Competition>('/daily/on-going')
const { data: league } = await useApi<LeagueSession>('/league/session/next')
const bgs = ['#FF4B4B', '#4CAF50', '#2196F3', '#FFC107', '#9C27B0', '#FF9800']
</script>

<template>
  <div class="mx-auto py-4">
    <div class="grid lg:grid-cols-3 lg:grid-flow-dense gap-2 lg:gap-4">
      <div class="lg:col-span-2">
        <h1 class="text-4xl font-bold mb-4 flex items-center gap-2">
          <div class="grid grid-cols-3 gap-px">
            <div
              v-for="i in 9"
              :key="i"
              class="w-3 h-3 transition-all duration-500"
              :style="{
                backgroundColor: bgs[Math.floor(Math.random() * 6)],
              }"
            />
          </div>
          <Icon name="material-symbols:edit" class="-ml-8" />
          {{ $t('title') }}
        </h1>

        <div class="bg-white shadow-md p-4 mb-4">
          <I18nT tag="blockquote" keypath="index.defination" scope="global" cite="" class="text-gray-600 italic">
            <template #title>
              <b>{{ $t('title') }}</b>
            </template>
            <template #or>
              <b>F</b>ewest <b>M</b>oves <b>C</b>hallenge,
            </template>
            <template #fmc>
              <b>FMC</b>
            </template>
            <template #wiki>
              <footer class="text-right mt-4">
                <span class="text-gray-400 -tracking-[0.15rem] mr-2 select-none">--</span>
                <a href="https://www.speedsolving.com/wiki/index.php/Fewest_Moves_Challenge" target="_blank" class="text-blue-500 hover:text-blue-600">{{ $t('index.speedsolvingWiki') }}</a>
              </footer>
            </template>
          </I18nT>
        </div>
      </div>

      <div class="bg-white shadow-md p-4 mb-4 lg:col-span-2">
        <h2 class="text-2xl font-bold mb-4 flex items-center gap-2">
          <Icon name="mdi:book-open-variant" />
          {{ $t('tutorial.title') }}
        </h2>
        <NuxtLink to="/tutorial/htr-diagram" class="flex items-center gap-3 text-xl text-blue-500 hover:text-blue-600 transition-colors">
          <Icon name="game-icons:maze" size="32" />
          <span>{{ $t('tutorial.htrDiagram.title') }}</span>
        </NuxtLink>
      </div>

      <div class="lg:row-span-2">
        <LeagueConciseSummary :league="league" />
      </div>

      <div>
        <div v-if="weekly" class="bg-white shadow-md border-l-2 md:border-l-4 border-blue-500 p-2 md:p-4">
          <h2 class="text-2xl font-bold mb-4 flex items-center gap-2">
            <NuxtLink :to="competitionPath(weekly)" class="flex items-center gap-2 hover:text-blue-500">
              <Icon name="mdi:calendar-week" />
              {{ weekly.name }}
            </NuxtLink>
          </h2>
          <WeeklySummary :competition="weekly" />
        </div>
        <div class="mt-4">
          <ButtonPrimary to="/chain">
            {{ $t('chain.title') }}
          </ButtonPrimary>
        </div>
      </div>

      <div>
        <div v-if="daily" class="bg-white shadow-md border-l-2 md:border-l-4 border-green-500 p-2 md:p-4">
          <h2 class="text-2xl font-bold mb-4 flex items-center gap-2">
            <NuxtLink :to="competitionPath(daily)" class="flex items-center gap-2 hover:text-blue-500">
              <Icon name="mdi:calendar-today" />
              {{ daily.name }}
            </NuxtLink>
          </h2>
          <WeeklySummary :competition="daily" />
        </div>
        <div class="bg-white shadow-md border-l-2 md:border-l-4 border-purple-500 p-2 lg:p-4 mt-2 lg:mt-4">
          <h2 class="text-2xl font-bold mb-4 flex items-center gap-2">
            <Icon name="mdi:infinity" />
            {{ $t('endless.title') }}
          </h2>
          <EndlessList />
        </div>
      </div>

      <div>
        <div class="bg-white shadow-md border-l-2 md:border-l-4 border-orange-500 p-2 md:p-4">
          <h3 class="text-xl font-bold mb-4 flex items-center gap-2">
            <Icon name="mdi:clock-outline" />
            {{ $t('index.latest') }}
          </h3>
          <div class="space-y-4">
            <IfSummary v-for="finder in finders" :key="finder.hash" :finder="finder" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
