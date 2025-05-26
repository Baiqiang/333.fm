<script setup lang="ts">
const props = defineProps<{
  duel: LeagueDuel
  ended: boolean
}>()
const user = useUser()
const user1Class = computed(() => {
  if (user.id === props.duel.user1?.id) {
    return 'bg-orange-200'
  }
  return ''
})
const user2Class = computed(() => {
  if (user.id === props.duel.user2?.id) {
    return 'bg-orange-200'
  }
  return ''
})
</script>

<template>
  <div class="grid grid-cols-subgrid col-span-full border-b border-r border-l border-black">
    <UserAvatarName v-if="duel.user1" :user="duel.user1" class="justify-start flex-row-reverse pl-7 pr-1" :class="user1Class" />
    <ColoredMoves
      v-for="i in 3"
      :key="i"
      class="p-1 border-l border-black"
      :class="user1Class"
      :value="ended ? duel.user1Result?.values[i - 1] : 0"
      :dns="ended"
      placeholder="-"
    />
    <div class="p-1 border-l border-black text-center" :class="user1Class">
      {{ duel.ended ? duel.user1Points : '-' }}
    </div>
    <div class="p-1 border-l border-black text-center font-bold" :class="user1Class">
      {{ leagueWeekPoints(duel.user1Points, duel.user2Points) }}
    </div>
    <div class="p-1 border-l border-black text-center font-bold" :class="user2Class">
      {{ leagueWeekPoints(duel.user2Points, duel.user1Points) }}
    </div>
    <div class="p-1 border-l border-black text-center" :class="user2Class">
      {{ duel.ended ? duel.user2Points : '-' }}
    </div>
    <ColoredMoves
      v-for="i in 3"
      :key="i"
      class="p-1 border-l border-black"
      :class="user2Class"
      :value="ended ? duel.user2Result?.values[i - 1] : 0"
      :dns="ended"
      placeholder="-"
    />
    <UserAvatarName v-if="duel.user2" :user="duel.user2" class="border-l border-black px-1" :class="user2Class" />
  </div>
</template>
