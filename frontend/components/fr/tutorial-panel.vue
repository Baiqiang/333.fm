<script setup lang="ts">
import {
  cornerCases,
  edgeCases,
  FALSE_FR_SETUP,
  FR_LIMITED_SCRAMBLE,
  FR_TRIGGER_SETUP,
  FR_TUTORIAL_URL,
  PARITY_INSERT_SETUP,
  TUTORIAL_SPECIAL_40_0,
  tutorialCases,
} from '~/utils/fr/case-data'

const corner1Setup = cornerCases.find(c => c.label === '1')!.setup
const corner2FbSetup = cornerCases.find(c => c.label === '2FB')!.setup
const edge40Setup = edgeCases.find(c => c.label === '4-0')!.setup
const simpleCases = tutorialCases.filter(c => c.tier === 'simple')
const hardCases = tutorialCases.filter(c => c.tier === 'hard')
const { cornerCase, edgeCase } = useFrTrainerTutorialText()
</script>

<template>
  <div class="space-y-8">
    <section>
      <h2 class="font-semibold text-lg mb-2">
        {{ $t('tools.frTrainer.tutorial.section.intro') }}
      </h2>
      <p class="text-sm text-gray-600 mb-3 leading-relaxed">
        {{ $t('tools.frTrainer.tutorial.intro.body') }}
      </p>
      <FrTutorialCubeStep
        :body="$t('tools.frTrainer.tutorial.intro.limitedScramble')"
        :scramble="FR_LIMITED_SCRAMBLE"
        emphasis="axis"
      />
    </section>

    <section>
      <h2 class="font-semibold text-lg mb-2">
        {{ $t('tools.frTrainer.tutorial.section.corners') }}
      </h2>
      <p class="text-sm text-gray-600 mb-3 leading-relaxed">
        {{ $t('tools.frTrainer.tutorial.corners.body') }}
      </p>
      <div class="grid sm:grid-cols-2 gap-2">
        <FrTutorialCubeStep
          v-for="c in cornerCases"
          :key="c.label"
          :title="c.label"
          :body="cornerCase(c.label)"
          :scramble="c.setup"
          emphasis="corners"
        />
      </div>
    </section>

    <section>
      <h2 class="font-semibold text-lg mb-2">
        {{ $t('tools.frTrainer.tutorial.section.edges') }}
      </h2>
      <p class="text-sm text-gray-600 mb-3 leading-relaxed">
        {{ $t('tools.frTrainer.tutorial.edges.body') }}
      </p>
      <div class="grid sm:grid-cols-2 gap-2">
        <FrTutorialCubeStep
          v-for="c in edgeCases"
          :key="c.label"
          :title="c.label"
          :body="edgeCase(c.label)"
          :scramble="c.setup"
          emphasis="edges"
        />
      </div>
    </section>

    <section>
      <h2 class="font-semibold text-lg mb-2">
        {{ $t('tools.frTrainer.tutorial.section.howTo') }}
      </h2>
      <p class="text-sm text-gray-600 mb-3 leading-relaxed">
        {{ $t('tools.frTrainer.tutorial.howTo.body') }}
      </p>

      <p class="text-xs font-semibold text-gray-500 mb-2">
        {{ $t('tools.frTrainer.tutorial.howTo.cornersOnly') }}
      </p>
      <div class="space-y-2 mb-4">
        <FrTutorialCubeStep
          :title="$t('tools.frTrainer.tutorial.howTo.corner1Title')"
          :body="$t('tools.frTrainer.tutorial.howTo.corner1Body')"
          :scramble="corner1Setup"
          :solution="['U2']"
          emphasis="corners"
          alg-label="U2"
        />
        <FrTutorialCubeStep
          :title="$t('tools.frTrainer.tutorial.howTo.corner2Title')"
          :body="$t('tools.frTrainer.tutorial.howTo.corner2Body')"
          :scramble="corner2FbSetup"
          :solution="['R2', 'U2']"
          emphasis="corners"
          alg-label="R2 U2"
        />
      </div>

      <p class="text-xs font-semibold text-gray-500 mb-2">
        {{ $t('tools.frTrainer.tutorial.howTo.edgesOnly') }}
      </p>
      <FrTutorialCubeStep
        class="mb-4"
        :title="$t('tools.frTrainer.tutorial.howTo.edge40Title')"
        :body="$t('tools.frTrainer.tutorial.howTo.edge40Body')"
        :scramble="edge40Setup"
        :solution="['U2']"
        emphasis="edges"
        alg-label="U2"
      />

      <p class="text-xs font-semibold text-gray-500 mb-2">
        {{ $t('tools.frTrainer.tutorial.howTo.simpleCases') }}
      </p>
      <div class="space-y-3 mb-4">
        <FrTutorialCaseCard v-for="item in simpleCases" :key="item.label" :item="item" />
      </div>

      <p class="text-xs font-semibold text-gray-500 mb-2">
        {{ $t('tools.frTrainer.tutorial.howTo.hardCases') }}
      </p>
      <div class="space-y-3 mb-4">
        <FrTutorialCaseCard v-for="item in hardCases" :key="item.label" :item="item" />
      </div>

      <p class="text-xs font-semibold text-gray-500 mb-2">
        {{ $t('tools.frTrainer.tutorial.howTo.specialCases') }}
      </p>
      <FrTutorialCaseCard :item="TUTORIAL_SPECIAL_40_0" />
      <p class="text-sm text-gray-600 mt-2 leading-relaxed">
        {{ $t('tools.frTrainer.tutorial.specialNotes') }}
      </p>
    </section>

    <section>
      <h2 class="font-semibold text-lg mb-2">
        {{ $t('tools.frTrainer.tutorial.section.trueFr') }}
      </h2>
      <p class="text-sm text-gray-600 mb-3 leading-relaxed">
        {{ $t('tools.frTrainer.tutorial.trueFr.body') }}
      </p>
      <FrTutorialCubeStep
        :title="$t('tools.frTrainer.tutorial.trueFr.falseExampleTitle')"
        :body="$t('tools.frTrainer.tutorial.trueFr.falseExampleBody')"
        :scramble="FALSE_FR_SETUP"
        emphasis="axis"
      />
      <p class="text-xs font-semibold text-gray-500 mt-4 mb-2">
        {{ $t('tools.frTrainer.tutorial.trueFr.parityTitle') }}
      </p>
      <p class="text-sm text-gray-600 mb-2">
        {{ $t('tools.frTrainer.tutorial.trueFr.parityBody') }}
      </p>
      <div class="space-y-2">
        <FrTutorialCubeStep
          :title="$t('tools.frTrainer.tutorial.trueFr.parity22Title')"
          :body="$t('tools.frTrainer.tutorial.trueFr.parity22Body')"
          :scramble="PARITY_INSERT_SETUP"
          emphasis="axis"
        />
        <FrTutorialCubeStep
          :title="$t('tools.frTrainer.tutorial.trueFr.parityDemoTitle')"
          :body="$t('tools.frTrainer.tutorial.trueFr.parityDemoBody')"
          :scramble="FR_TRIGGER_SETUP"
          :solution="['F2', 'U2', 'F2', 'R2', 'U2']"
          emphasis="axis"
          alg-label="[F2 U2 F2] R2 U2"
        />
      </div>
    </section>

    <section>
      <h2 class="font-semibold text-lg mb-2">
        {{ $t('tools.frTrainer.tutorial.section.tips') }}
      </h2>
      <ul class="list-disc list-inside text-sm text-gray-600 space-y-2">
        <li>{{ $t('tools.frTrainer.tutorial.tips.0') }}</li>
        <li>{{ $t('tools.frTrainer.tutorial.tips.1') }}</li>
        <li>{{ $t('tools.frTrainer.tutorial.tips.2') }}</li>
      </ul>
    </section>

    <section>
      <h2 class="font-semibold text-lg mb-2">
        {{ $t('tools.frTrainer.tutorial.section.video') }}
      </h2>
      <p class="text-sm text-gray-600 mb-2">
        {{ $t('tools.frTrainer.tutorial.videoIntro') }}
      </p>
      <a
        :href="FR_TUTORIAL_URL"
        target="_blank"
        rel="noopener noreferrer"
        class="inline-block px-3 py-1 border border-indigo-300 text-indigo-600 rounded text-sm hover:bg-indigo-50"
      >
        {{ $t('tools.frTrainer.tutorial.videoLink') }}
      </a>
    </section>

    <p class="text-xs text-gray-500 border-t pt-4 leading-relaxed">
      {{ $t('tools.frTrainer.tutorial.attribution') }}
    </p>
  </div>
</template>
