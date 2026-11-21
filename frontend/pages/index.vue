<script setup lang="ts">
const { t } = useI18n()
useSeoMeta({
  title: `${t('title')} - 333.fm`,
  titleTemplate: null,
})
interface Tutorial {
  id: number
  title: string
  url: string
  category: string
  language: string
}
const { data: tutorials } = await useApi<Tutorial[]>('/tutorial')
const { data: weekly } = await useApi<Competition>('/weekly/on-going')
const { data: daily } = await useApi<Competition>('/daily/on-going')
const { data: league } = await useApi<LeagueSeason>('/league/season/next')
const bgs = ['#FF4B4B', '#4CAF50', '#2196F3', '#FFC107', '#9C27B0', '#FF9800']
const logoColors = ref(Array.from({ length: 9 }, (_, i) => bgs[i % bgs.length]))
onMounted(() => {
  logoColors.value = logoColors.value.map(() => bgs[Math.floor(Math.random() * bgs.length)])
})
</script>

<template>
  <div class="py-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:gap-4">
    <div class="contents lg:flex lg:flex-col lg:gap-4 lg:flex-2 lg:min-w-0">
      <section class="order-1 bg-white shadow-md p-4">
        <h1 class="text-3xl md:text-4xl font-bold mb-3 flex items-center gap-2">
          <div class="grid grid-cols-3 gap-px">
            <div
              v-for="color, i in logoColors"
              :key="i"
              class="w-3 h-3 transition-all duration-500"
              :style="{ backgroundColor: color }"
            />
          </div>
          <Icon name="material-symbols:edit" class="-ml-8" />
          {{ $t('title') }}
        </h1>
        <I18nT tag="blockquote" keypath="index.defination" scope="global" cite="" class="text-gray-600 italic border-l-2 border-gray-200 pl-3">
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
            <footer class="text-right mt-2 not-italic text-sm">
              <span class="text-gray-400 -tracking-[0.15rem] mr-2 select-none">--</span>
              <a href="https://www.speedsolving.com/wiki/index.php/Fewest_Moves_Challenge" target="_blank" class="text-blue-500 hover:text-blue-600">{{ $t('index.speedsolvingWiki') }}</a>
            </footer>
          </template>
        </I18nT>
      </section>

      <HomeLeague :league="league" class="order-2" />

      <HomeCompetition v-if="weekly" :competition="weekly" icon="mdi:calendar-week" wide class="order-3" />

      <HomePractice class="order-5" />
    </div>

    <div class="contents lg:flex lg:flex-col lg:gap-4 lg:flex-1 lg:min-w-0">
      <HomeCompetition v-if="daily" :competition="daily" icon="mdi:calendar-today" class="order-4" />

      <HomeEntries class="order-6" />

      <HomeEndless class="order-8" />

      <HomeCard :title="$t('tutorial.title')" icon="mdi:book-open-variant" to="/tutorial" class="order-7">
        <template #actions>
          <HomeMoreLink to="/tutorial" />
        </template>
        <div v-if="tutorials?.length" class="grid md:grid-cols-2 lg:grid-cols-1 gap-x-4 gap-y-1.5">
          <a
            v-for="item in [...tutorials.slice(0, 5), { id: 0, title: $t('tutorial.htrDiagram.title'), url: '/tutorial/htr-diagram', category: 'HTR' }]"
            :key="item.id"
            :href="item.url"
            :target="item.url.startsWith('/') ? undefined : '_blank'"
            class="flex items-center gap-2 text-sm text-blue-500 hover:text-blue-700 truncate"
          >
            <span class="text-gray-300">·</span>
            {{ item.title }}
            <span v-if="item.category" class="text-xs text-gray-400 shrink-0">{{ item.category }}</span>
          </a>
        </div>
      </HomeCard>
    </div>
  </div>
</template>
