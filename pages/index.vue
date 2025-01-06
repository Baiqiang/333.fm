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
</script>

<template>
  <div class="grid md:grid-cols-[1fr_20rem] gap-4 py-4">
    <div class="flex-1">
      <h1 class="text-3xl mb-4">
        {{ $t('title') }}
      </h1>
      <I18nT tag="blockquote" keypath="index.defination" scope="global" cite="">
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
          <footer class="text-right">
            <span class="text-gray-500 -tracking-[0.15rem] mr-2 select-none">--</span>
            <a href="https://www.speedsolving.com/wiki/index.php/Fewest_Moves_Challenge" target="_blank" class="text-blue-500">{{ $t('index.speedsolvingWiki') }}</a>
          </footer>
        </template>
      </I18nT>
      <div>
        <h2 class="font-bold text-xl mb-2">
          {{ $t('tutorial.title') }}
        </h2>
        <NuxtLink to="/tutorial/htr-diagram" class="text-blue-500 text-lg md:text-xl flex items-center">
          <Icon name="game-icons:maze" size="30" />{{ $t('tutorial.htrDiagram.title') }}
        </NuxtLink>
      </div>
      <div class="flex flex-col md:flex-row gap-2 mt-2">
        <div class="flex-1">
          <div v-if="weekly" class="mb-4">
            <h2 class="font-bold text-xl">
              {{ weekly.name }}
            </h2>
            <WeeklySummary :competition="weekly" class="mt-4" />
          </div>
          <div v-if="daily" class="mb-4">
            <h2 class="font-bold text-xl">
              {{ daily.name }}
            </h2>
            <WeeklySummary :competition="daily" class="mt-4" />
          </div>
          <div>
            <hr class="mb-2">
            <NuxtLink to="/chain" class="bg-indigo-500 text-white px-3 py-2">
              {{ $t('chain.title') }}
            </NuxtLink>
          </div>
        </div>
        <div class="flex-1">
          <h2 class="font-bold text-xl">
            {{ $t('endless.title') }}
          </h2>
          <EndlessList />
        </div>
      </div>
    </div>
    <div class="">
      <h3 class="py-4 font-bold">
        {{ $t('index.latest') }}
      </h3>
      <div v-for="finder in finders" :key="finder.hash">
        <IfSummary :finder="finder" class="mb-2" />
      </div>
    </div>
  </div>
</template>
