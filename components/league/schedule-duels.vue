<script setup lang="ts">
defineProps<{
  duels: LeagueDuel[]
}>()
</script>

<template>
  <div v-for="duel of duels" :key="duel.id" class="grid grid-cols-subgrid col-span-full border-b border-r border-l border-black">
    <UserAvatarName v-if="duel.player1" :user="duel.player1.user" class="justify-start flex-row-reverse px-2" />
    <ColoredMoves v-for="i in 3" :key="i" class="p-1 border-l border-black" :value="duel.player1Result?.values[i - 1]" placeholder="-" />
    <div class="p-1 border-l border-black text-center">
      {{ duel.ended ? duel.player1Points : '-' }}
    </div>
    <div class="p-1 border-l border-black text-center font-bold">
      {{ leagueWeekPoints(duel.player1Points, duel.player2Points) }}
    </div>
    <div class="p-1 border-l border-black text-center font-bold">
      {{ leagueWeekPoints(duel.player2Points, duel.player1Points) }}
    </div>
    <div class="p-1 border-l border-black text-center">
      {{ duel.ended ? duel.player2Points : '-' }}
    </div>
    <ColoredMoves v-for="i in 3" :key="i" class="p-1 border-l border-black" :value="duel.player2Result?.values[i - 1]" placeholder="-" />
    <UserAvatarName v-if="duel.player2" :user="duel.player2.user" class="border-l border-black px-2" />
  </div>
</template>
