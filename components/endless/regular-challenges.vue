<script setup lang="ts">
defineProps<{
  challenges?: Challenge[]
}>()
</script>

<template>
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
      <tr v-for="{ challenge, startLevel, endLevel, levels }, i in challenges" :key="i" class="border-b border-gray-400 odd:bg-gray-200">
        <td v-if="levels" class="pl-1">
          {{ levels.join(', ') }}
        </td>
        <td v-else class="pl-1">
          {{ startLevel }}-{{ endLevel || '∞' }}
        </td>
        <td>
          ≤{{ formatResult((challenge as RegularChallenge).single) }}
        </td>
        <td>
          ≤{{ formatResult((challenge as RegularChallenge).team[0]) }}, {{ $t('endless.progress.competitors', { competitors: (challenge as RegularChallenge).team[1] }) }}
        </td>
      </tr>
    </tbody>
  </table>
</template>
