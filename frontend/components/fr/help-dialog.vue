<script setup lang="ts">
import { algTable, cornerCases, edgeCases } from '~/utils/fr/case-data'

const open = defineModel<boolean>('open', { default: false })
const { cornerCase, edgeCase } = useFrTrainerTutorialText()
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      @click.self="open = false"
    >
      <div class="bg-white dark:bg-gray-900 shadow-xl rounded-lg max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-lg font-bold">
            {{ $t('tools.frTrainer.help.title') }}
          </h2>
          <button type="button" class="text-gray-500 hover:text-gray-700" @click="open = false">
            {{ $t('tools.frTrainer.help.close') }}
          </button>
        </div>

        <p class="text-xs text-gray-500 mb-4">
          {{ $t('tools.frTrainer.help.intro') }}
        </p>

        <h3 class="font-semibold mb-2">
          {{ $t('tools.frTrainer.help.cornerTitle') }}
        </h3>
        <div class="grid sm:grid-cols-2 gap-3 mb-5">
          <div
            v-for="c in cornerCases"
            :key="c.label"
            class="border rounded p-2 flex gap-3 items-start"
          >
            <FrCube
              :scramble="c.setup"
              axis-key="ud"
              emphasis="corners"
              css3d
              cube-class="w-24 shrink-0"
            />
            <div class="min-w-0 flex-1">
              <span class="inline-block px-1.5 py-0.5 text-xs bg-indigo-100 text-indigo-700 rounded mb-1">{{ c.label }}</span>
              <p class="text-xs text-gray-600">
                {{ cornerCase(c.label) }}
              </p>
            </div>
          </div>
        </div>

        <h3 class="font-semibold mb-2">
          {{ $t('tools.frTrainer.help.edgeTitle') }}
        </h3>
        <div class="grid sm:grid-cols-2 gap-3 mb-5">
          <div
            v-for="c in edgeCases"
            :key="c.label"
            class="border rounded p-2 flex gap-3 items-start"
          >
            <FrCube
              :scramble="c.setup"
              axis-key="ud"
              emphasis="edges"
              css3d
              cube-class="w-24 shrink-0"
            />
            <div class="min-w-0 flex-1">
              <span class="inline-block px-1.5 py-0.5 text-xs bg-indigo-100 text-indigo-700 rounded mb-1">{{ c.label }}</span>
              <p class="text-xs text-gray-600">
                {{ edgeCase(c.label) }}
              </p>
            </div>
          </div>
        </div>

        <h3 class="font-semibold mb-2">
          {{ $t('tools.frTrainer.help.algTitle') }}
        </h3>
        <table class="w-full text-sm border mb-5">
          <thead>
            <tr class="bg-gray-50">
              <th class="border px-2 py-1 text-left">
                {{ $t('tools.frTrainer.help.algCase') }}
              </th>
              <th class="border px-2 py-1 text-left">
                {{ $t('tools.frTrainer.help.algMoves') }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in algTable" :key="row.c">
              <td class="border px-2 py-1">
                {{ row.c }}
              </td>
              <td class="border px-2 py-1 font-mono">
                {{ row.alg }}
              </td>
            </tr>
          </tbody>
        </table>

        <h3 class="font-semibold mb-2">
          {{ $t('tools.frTrainer.help.trueFrTitle') }}
        </h3>
        <p class="text-sm text-gray-600 mb-2">
          {{ $t('tools.frTrainer.help.trueFrBody1') }}
        </p>
        <p class="text-sm text-gray-600">
          {{ $t('tools.frTrainer.help.trueFrBody2') }}
        </p>
      </div>
    </div>
  </Teleport>
</template>
