<script setup lang="ts">
const { t } = useI18n()
const season = inject(SYMBOL_LEAGUE_SEASON)!
const weeks = computed(() => season.value.competitions.length + 1)
const user = useUser()
const tierPlayers = ref<Record<number, User[]>>(Object.fromEntries(season.value.tiers.map(tier => [tier.id, tier.players.map(player => player.user)])))
useSeoMeta({
  title: `${t('league.nav.tiers')} - ${season.value.title}`,
})
</script>

<template>
  <div class="px-2">
    <Heading1>
      {{ $t('league.nav.tiers') }}
    </Heading1>
    <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
      <div
        v-for="tier, index in season.tiers"
        :key="tier.id"
        class="bg-white shadow-md overflow-hidden transition-all duration-300 hover:shadow-lg"
      >
        <h4 class="font-bold p-4 flex items-center" :class="tierBackgrounds[index]">
          <span class="text-xl">{{ tier.name }}</span>
        </h4>
        <div class="divide-y divide-gray-100">
          <div
            v-for="week in weeks"
            :key="week"
            class="p-4 hover:bg-indigo-50 transition-colors flex items-center"
            :class="{ 'bg-orange-100': user.id === tierPlayers[tier.id][week - 1]?.id }"
          >
            <span class="w-8 text-sm font-medium text-gray-500">{{ week }}</span>
            <UserAvatarName
              :user="tierPlayers[tier.id][week - 1]"
              class="flex-1"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
