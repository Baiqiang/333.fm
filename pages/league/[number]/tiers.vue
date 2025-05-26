<script setup lang="ts">
const session = inject(SYMBOL_LEAGUE_SESSION)!
const weeks = computed(() => session.value.competitions.length + 1)
const tierPlayers = ref<Record<number, User[]>>(Object.fromEntries(session.value.tiers.map(tier => [tier.id, tier.players.map(player => player.user)])))
useSeoMeta({
  title: `Tiers - ${session.value.title}`,
})
</script>

<template>
  <div>
    <h3 class="text-lg font-bold my-2 w-full">
      Tiers
    </h3>
    <div v-for="tier, index in session.tiers" :key="tier.id" :class="tierBackgrounds[index]" class="my-2">
      <h4 class="font-bold p-2 border-b border-gray-500">
        {{ tier.name }}
      </h4>
      <div class="flex flex-col gap-1 p-2">
        <div v-for="week in weeks" :key="week">
          <UserAvatarName :user="tierPlayers[tier.id][week - 1]" />
        </div>
      </div>
    </div>
  </div>
</template>
