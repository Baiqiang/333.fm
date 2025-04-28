<script setup lang="ts">
import type { BossChallenge } from '~/utils/competition'

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
          Instant Kill
        </th>
        <th class="">
          HP
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
          ≤{{ formatResult((challenge as BossChallenge).instantKill) }}
        </td>
        <td>
          {{ (challenge as BossChallenge).minHitPoints }}-{{ (challenge as BossChallenge).maxHitPoints }}
        </td>
      </tr>
    </tbody>
  </table>
</template>
