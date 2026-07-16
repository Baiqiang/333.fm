<script setup lang="ts">
import { groupBrCasesBySlice } from '~/utils/pensuke/case-data'
import { PENSUKE_TUTORIAL_URL } from '~/utils/pensuke/display'

const { t } = useI18n()

const brCaseGroups = groupBrCasesBySlice()

function caseBody(label: string): string {
  return t(`tools.pensukeTrainer.help.cases.${label}`)
}
</script>

<template>
  <div class="space-y-8">
    <section>
      <h2 class="font-semibold text-lg mb-2">
        {{ $t('tools.pensukeTrainer.tutorial.section.intro') }}
      </h2>
      <p class="text-sm text-gray-600 mb-3 leading-relaxed">
        {{ $t('tools.pensukeTrainer.tutorial.intro.body') }}
      </p>
    </section>

    <section>
      <h2 class="font-semibold text-lg mb-2">
        {{ $t('tools.pensukeTrainer.tutorial.section.concepts') }}
      </h2>
      <ul class="space-y-2">
        <li
          v-for="(item, i) in $tm('tools.pensukeTrainer.tutorial.concepts.items')"
          :key="i"
          class="flex gap-2 text-sm text-gray-600 leading-relaxed"
        >
          <span class="text-indigo-500 font-semibold shrink-0">{{ i + 1 }}.</span>
          <span>{{ item }}</span>
        </li>
      </ul>
    </section>

    <section>
      <h2 class="font-semibold text-lg mb-2">
        {{ $t('tools.pensukeTrainer.tutorial.section.cases') }}
      </h2>
      <p class="text-sm text-gray-600 dark:text-gray-400 mb-3 leading-relaxed">
        {{ $t('tools.pensukeTrainer.tutorial.cases.body') }}
      </p>
      <div class="space-y-6">
        <div
          v-for="group in brCaseGroups"
          :key="group.bound"
          class="space-y-3"
        >
          <h3 class="font-semibold text-base text-gray-800 dark:text-gray-200">
            {{ $t('tools.pensukeTrainer.tutorial.sliceGroup', { n: group.bound }) }}
          </h3>
          <div class="grid sm:grid-cols-2 gap-2">
            <PensukeBrCaseCard
              v-for="c in group.cases"
              :key="c.label"
              :item="c"
              :body="caseBody(c.label)"
            />
          </div>
        </div>
      </div>
    </section>

    <section>
      <h2 class="font-semibold text-lg mb-2">
        {{ $t('tools.pensukeTrainer.tutorial.section.video') }}
      </h2>
      <p class="text-sm text-gray-600 mb-2">
        {{ $t('tools.pensukeTrainer.tutorial.videoIntro') }}
      </p>
      <a
        :href="PENSUKE_TUTORIAL_URL"
        target="_blank"
        rel="noopener noreferrer"
        class="inline-block px-3 py-1 border border-indigo-300 text-indigo-600 text-sm hover:bg-indigo-50"
      >
        {{ $t('tools.pensukeTrainer.tutorial.videoLink') }}
      </a>
    </section>

    <p class="text-xs text-gray-500 border-t pt-4 leading-relaxed">
      {{ $t('tools.pensukeTrainer.tutorial.attribution') }}
    </p>
  </div>
</template>
