<script setup lang="ts">
import type { PensukePracticeRecord } from '~/composables/pensuke-practice-history'

const { t } = useI18n()
const route = useRoute()

useSeoMeta({
  title: t('tools.pensukeTrainer.title'),
})

const MODES = ['analyze', 'practice', 'tutorial'] as const
type PensukeMode = typeof MODES[number]

const activeMode = computed<PensukeMode>(() => {
  const q = route.query.mode
  return (typeof q === 'string' && MODES.includes(q as PensukeMode)) ? q as PensukeMode : 'analyze'
})

const historyRef = ref<{ refresh: () => void } | null>(null)
const practiceRef = ref<{ replayFromHistory: (record: PensukePracticeRecord) => void } | null>(null)

function onHistoryChange() {
  historyRef.value?.refresh()
}

function onHistoryReplay(record: PensukePracticeRecord) {
  practiceRef.value?.replayFromHistory(record)
}
</script>

<template>
  <div class="pb-20">
    <div class="mb-2">
      <Heading1>
        {{ $t('tools.pensukeTrainer.title') }}
      </Heading1>
      <p class="text-sm text-gray-600 mb-1">
        {{ $t('tools.pensukeTrainer.fullName') }}
      </p>
      <p class="text-sm text-gray-600">
        {{ $t('tools.pensukeTrainer.subtitle') }}
      </p>
    </div>

    <div class="my-4 overflow-x-auto pb-2">
      <div class="flex gap-2 flex-nowrap min-w-max">
        <NuxtLink
          v-for="mode in MODES"
          :key="mode"
          :to="{ path: '/tools/pensuke-trainer', query: { mode } }"
          class="shrink-0 px-3 py-2 text-sm font-medium border transition-all duration-200"
          :class="activeMode === mode
            ? 'bg-indigo-500 text-white border-indigo-500 shadow-md'
            : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-300 hover:text-indigo-500'"
        >
          {{ $t(`tools.pensukeTrainer.mode.${mode}`) }}
        </NuxtLink>
      </div>
    </div>

    <PensukeAnalyzePanel v-if="activeMode === 'analyze'" />

    <template v-if="activeMode === 'practice'">
      <PensukePracticePanel ref="practiceRef" @history-change="onHistoryChange" />
      <PensukePracticeHistory ref="historyRef" @replay="onHistoryReplay" />
    </template>

    <PensukeTutorialPanel v-if="activeMode === 'tutorial'" />
  </div>
</template>
