<script setup lang="ts">
defineProps<{
  challenges?: Challenge[]
}>()
</script>

<template>
  <ol class="list-disc list-inside marker:text-indigo-500 pl-4 text-gray-800">
    <li v-if="!challenges">
      {{ $t('endless.challenge.any') }}
    </li>
    <template v-else-if="challenges.length === 1">
      <li>
        {{ $t('endless.challenge.single', { moves: formatResult(challenges[0].single) }) }}
      </li>
      <li>
        {{ $t('endless.challenge.team', { moves: formatResult(challenges[0].team[0]), persons: challenges[0].team[1] }) }}
      </li>
    </template>
    <template v-else>
      <table class="border-spacing-3 table-fixed w-80">
        <thead>
          <tr class="font-bold border-b-2 border-gray-400">
            <th class="pl-1">
              Level
            </th>
            <th class="">
              Solo
            </th>
            <th class="">
              Team
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="{ single, team, startLevel, endLevel, levels }, i in challenges" :key="i" class="border-b border-gray-400 odd:bg-gray-200">
            <td v-if="levels" class="pl-1">
              {{ levels.join(', ') }}
            </td>
            <td v-else class="pl-1">
              {{ startLevel }}-{{ endLevel || '∞' }}
            </td>
            <td>
              ≤{{ formatResult(single) }}
            </td>
            <td>
              ≤{{ formatResult(team[0]) }}, {{ $t('endless.progress.competitors', { competitors: team[1] }) }}
            </td>
          </tr>
        </tbody>
      </table>
    </template>
  </ol>
</template>
