<script setup lang="ts">
defineProps<{
  challenges?: Challenge[]
}>()

function isRegularChallenge(challenge: Challenge) {
  return challenge.type === ChallengeType.REGULAR
}

function isAnyValidSolutionRule(challenge: Challenge) {
  return isRegularChallenge(challenge)
    && challenge.challenge.single === 8000
    && challenge.challenge.team[0] === 8000
    && challenge.challenge.team[1] === 1
}

function levelLabel(challenge: Challenge) {
  if (challenge.levels?.length) {
    return challenge.levels.join(', ')
  }
  if (challenge.startLevel === undefined || challenge.startLevel === null) {
    return '-'
  }
  return `${challenge.startLevel}-${challenge.endLevel ?? '∞'}`
}
</script>

<template>
  <ol class="list-disc list-inside marker:text-indigo-500 pl-4 text-gray-800">
    <li v-if="!challenges">
      {{ $t('endless.challenge.any') }}
    </li>
    <template v-else-if="challenges.length === 1">
      <template v-if="isRegularChallenge(challenges[0])">
        <li v-if="isAnyValidSolutionRule(challenges[0])">
          {{ $t('endless.challenge.any') }}
        </li>
        <template v-else>
          <li>
            {{ $t('endless.challenge.single', { moves: formatResult(challenges[0].challenge.single) }) }}
          </li>
          <li>
            {{ $t('endless.challenge.team', { moves: formatResult(challenges[0].challenge.team[0]), persons: challenges[0].challenge.team[1] }) }}
          </li>
        </template>
      </template>
      <template v-else>
        <li>
          {{ $t('endless.challenge.bossInstantKill', { moves: formatResult(challenges[0].challenge.instantKill) }) }}
        </li>
        <li>
          {{ $t('endless.challenge.bossHitPoints', { min: challenges[0].challenge.minHitPoints, max: challenges[0].challenge.maxHitPoints }) }}
        </li>
      </template>
    </template>
    <template v-else>
      <table class="border-spacing-3 w-100">
        <thead>
          <tr class="font-bold border-b-2 border-gray-400 dark:border-gray-600">
            <th class="pl-1 text-left">
              Level
            </th>
            <th class="text-left">
              Type
            </th>
            <th class="text-left">
              Rule
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="challenge, i in challenges.slice().reverse()" :key="i" class="border-b border-gray-400 dark:border-gray-600 odd:bg-gray-200 dark:odd:bg-gray-800">
            <td class="pl-1">
              {{ levelLabel(challenge) }}
            </td>
            <td>
              {{ challenge.type === ChallengeType.BOSS ? 'Boss' : 'Regular' }}
            </td>
            <td class="text-nowrap">
              <template v-if="isAnyValidSolutionRule(challenge)">
                {{ $t('endless.challenge.any') }}
              </template>
              <template v-else-if="isRegularChallenge(challenge)">
                ≤{{ formatResult(challenge.challenge.single) }},
                ≤{{ formatResult(challenge.challenge.team[0]) }} / {{ $t('endless.progress.competitors', { competitors: challenge.challenge.team[1] }) }}
              </template>
              <template v-else>
                KO ≤{{ formatResult(challenge.challenge.instantKill) }},
                HP {{ challenge.challenge.minHitPoints }}-{{ challenge.challenge.maxHitPoints }}
              </template>
            </td>
          </tr>
        </tbody>
      </table>
    </template>
  </ol>
</template>
