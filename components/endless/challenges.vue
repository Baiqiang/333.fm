<script setup lang="ts">
defineProps<{
  challenges?: Challenge[]
}>()
</script>

<template>
  <ol class="list-disc list-inside marker:text-indigo-500 pl-4 text-gray-800">
    <li v-if="!challenges || challenges.length === 0">
      {{ $t('endless.challenge.any') }}
    </li>
    <EndlessRegularChallenges v-else-if="challenges[0].type === ChallengeType.REGULAR" :challenges="challenges" />
    <EndlessBossChallenges v-else-if="challenges[0].type === ChallengeType.BOSS" :challenges="challenges" />
  </ol>
</template>
