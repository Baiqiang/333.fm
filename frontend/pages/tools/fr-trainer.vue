<script setup lang="ts">
import type { FrPracticeRecord } from '~/composables/fr-practice-history'

const { t } = useI18n()
const route = useRoute()

useSeoMeta({
  title: t('tools.frTrainer.title'),
})

const MODES = ['analyze', 'practice', 'tutorial'] as const
type FrMode = typeof MODES[number]

const activeMode = computed<FrMode>(() => {
  const q = route.query.mode
  return (typeof q === 'string' && MODES.includes(q as FrMode)) ? q as FrMode : 'analyze'
})

const helpOpen = ref(false)
const historyRef = ref<{ refresh: () => void } | null>(null)
const practiceRef = ref<{ replayFromHistory: (record: FrPracticeRecord) => void } | null>(null)

function onHistoryChange() {
  historyRef.value?.refresh()
}

function onHistoryReplay(record: FrPracticeRecord) {
  practiceRef.value?.replayFromHistory(record)
}
</script>

<template>
  <div class="pb-20">
    <Heading1>
      {{ $t('tools.frTrainer.title') }}
    </Heading1>
    <p class="text-sm text-gray-600 mb-1">
      {{ $t('tools.frTrainer.fullName') }}
    </p>
    <p class="text-sm text-gray-600 mb-6">
      {{ $t('tools.frTrainer.subtitle') }}
    </p>

    <div class="mb-4">
      <NuxtLink
        to="/tools/pensuke-trainer"
        class="inline-block px-3 py-2 text-sm border border-indigo-300 text-indigo-600 hover:bg-indigo-50"
      >
        {{ $t('tools.pensukeTrainer.crossLinkPensuke') }}
      </NuxtLink>
    </div>

    <div class="my-4 overflow-x-auto pb-2">
      <div class="flex gap-2 flex-nowrap min-w-max">
        <NuxtLink
          v-for="mode in MODES"
          :key="mode"
          :to="{ path: '/tools/fr-trainer', query: { mode } }"
          class="shrink-0 px-3 py-2 text-sm font-medium border transition-all duration-200"
          :class="activeMode === mode
            ? 'bg-indigo-500 text-white border-indigo-500 shadow-md'
            : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-300 hover:text-indigo-500'"
        >
          {{ $t(`tools.frTrainer.mode.${mode}`) }}
        </NuxtLink>
      </div>
    </div>

    <FrAnalyzePanel v-if="activeMode === 'analyze'" v-model:help-open="helpOpen" />

    <template v-if="activeMode === 'practice'">
      <FrPracticePanel ref="practiceRef" @history-change="onHistoryChange" @help="helpOpen = true" />
      <FrPracticeHistory ref="historyRef" @replay="onHistoryReplay" />
      <FrHelpDialog v-model:open="helpOpen" />
    </template>

    <FrTutorialPanel v-if="activeMode === 'tutorial'" />
  </div>
</template>
