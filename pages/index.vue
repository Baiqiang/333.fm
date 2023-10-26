<script setup lang="ts">
const { t } = useI18n()
useSeoMeta({
  title: `${t('title')} - 333.fm`,
  titleTemplate: null,
})
const { data: finders } = await useApi<InsertionFinder[]>('/if/latest')
if (!finders.value)
  finders.value = []
</script>

<template>
  <div class="grid md:grid-cols-[1fr_20rem] gap-4 py-4">
    <div class="flex-1">
      <h1 class="text-3xl mb-4">
        {{ $t('title') }}
      </h1>
      <I18nT tag="blockquote" keypath="index.defination" scope="global" cite="">
        aaaa
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
