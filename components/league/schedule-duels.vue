<script setup lang="ts">
defineProps<{
  duels: LeagueDuel[]
}>()
</script>

<template>
  <div v-for="duel of duels" :key="duel.id" class="grid grid-cols-subgrid col-span-full border-b border-r border-l border-black">
    <UserAvatarName v-if="duel.user1" :user="duel.user1" class="justify-start flex-row-reverse pl-7 pr-1" />
    <ColoredMoves v-for="i in 3" :key="i" class="p-1 border-l border-black" :value="duel.user1Result?.values[i - 1]" placeholder="-" />
    <div class="p-1 border-l border-black text-center">
      {{ duel.ended ? duel.user1Points : '-' }}
    </div>
    <div class="p-1 border-l border-black text-center font-bold">
      {{ leagueWeekPoints(duel.user1Points, duel.user2Points) }}
    </div>
    <div class="p-1 border-l border-black text-center font-bold">
      {{ leagueWeekPoints(duel.user2Points, duel.user1Points) }}
    </div>
    <div class="p-1 border-l border-black text-center">
      {{ duel.ended ? duel.user2Points : '-' }}
    </div>
    <ColoredMoves v-for="i in 3" :key="i" class="p-1 border-l border-black" :value="duel.user2Result?.values[i - 1]" placeholder="-" />
    <UserAvatarName v-if="duel.user2" :user="duel.user2" class="border-l border-black px-1" />
  </div>
</template>
