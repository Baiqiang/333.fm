<script setup lang="ts">
const props = defineProps<{
  duel: LeagueDuel
  ended: boolean
}>()
const user = useUser()
const user1Class = computed(() => {
  if (user.id === props.duel.user1?.id) {
    return 'bg-orange-50'
  }
  return ''
})
const user2Class = computed(() => {
  if (user.id === props.duel.user2?.id) {
    return 'bg-orange-50'
  }
  return ''
})
</script>

<template>
  <div class="grid grid-cols-subgrid col-span-full border-b border-indigo-100 hover:bg-gray-50 transition-colors">
    <UserAvatarName
      v-if="duel.user1"
      :user="duel.user1"
      class="justify-start flex-row-reverse pl-7 pr-2 py-2"
      :class="user1Class"
    />
    <ColoredMoves
      v-for="i in 3"
      :key="i"
      class="p-2 border-l border-indigo-100"
      :class="user1Class"
      :value="ended ? duel.user1Result?.values[i - 1] : 0"
      :dns="ended"
      placeholder="-"
    />
    <div class="p-2 border-l border-indigo-100 text-center font-medium" :class="user1Class">
      {{ duel.ended ? duel.user1Points : '-' }}
    </div>
    <div class="p-2 border-l border-indigo-100 text-center font-bold text-indigo-600" :class="user1Class">
      {{ leagueWeekPoints(duel.user1Points, duel.user2Points) }}
    </div>
    <div class="p-2 border-l border-indigo-100 text-center font-bold text-indigo-600" :class="user2Class">
      {{ leagueWeekPoints(duel.user2Points, duel.user1Points) }}
    </div>
    <div class="p-2 border-l border-indigo-100 text-center font-medium" :class="user2Class">
      {{ duel.ended ? duel.user2Points : '-' }}
    </div>
    <ColoredMoves
      v-for="i in 3"
      :key="i"
      class="p-2 border-l border-indigo-100"
      :class="user2Class"
      :value="ended ? duel.user2Result?.values[i - 1] : 0"
      :dns="ended"
      placeholder="-"
    />
    <UserAvatarName
      v-if="duel.user2"
      :user="duel.user2"
      class="border-l border-indigo-100 px-2 py-2"
      :class="user2Class"
    />
  </div>
</template>
