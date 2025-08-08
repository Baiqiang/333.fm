<script setup lang="ts">
const props = defineProps<{
  season: LeagueSeason
}>()

const currentWeek = computed(() => props.season.competitions.find(c => isInStatus(c, CompetitionStatus.ON_GOING)))
const pastWeeks = computed(() => props.season.competitions.filter(c => isInStatus(c, CompetitionStatus.ENDED)))
const futureWeeks = computed(() => props.season.competitions.filter(c => isInStatus(c, CompetitionStatus.NOT_STARTED)))

const totalPlayers = computed(() => props.season.tiers.reduce((sum, tier) => sum + tier.players.length, 0))
</script>

<template>
  <div class="py-4">
    <div class="bg-gradient-to-r from-blue-500 to-purple-500 p-4 text-white mb-6">
      <h1 class="text-3xl font-bold mb-3">
        {{ season.title }}
      </h1>
      <div class="grid grid-cols-3 gap-2 md:gap-3">
        <NuxtLink :to="`/league/${season.number}/standings`" class="text-center">
          <div class="text-2xl font-bold">
            {{ totalPlayers }}
          </div>
          <div class="text-sm opacity-80">
            {{ $t('league.summary.players') }}
          </div>
        </NuxtLink>
        <div class="text-center">
          <div class="text-2xl font-bold">
            {{ season.competitions.length }}
          </div>
          <div class="text-sm opacity-80">
            {{ $t('league.summary.weeks') }}
          </div>
        </div>
        <NuxtLink :to="`/league/${season.number}/tiers`" class="text-center">
          <div class="text-2xl font-bold">
            {{ season.tiers.length }}
          </div>
          <div class="text-sm opacity-80">
            {{ $t('league.summary.tiers') }}
          </div>
        </NuxtLink>
      </div>
    </div>

    <div v-if="currentWeek" class="bg-white shadow-lg p-4 mb-6">
      <h2 class="text-2xl font-bold text-gray-800 mb-3 flex items-center">
        <span class="w-3 h-3 bg-green-500 mr-2" />
        {{ $t('league.summary.ongoing', { week: currentWeek?.alias.split('-')[2] }) }}
      </h2>
      <WeeklySummary :competition="currentWeek" :show-cube="false" />
    </div>

    <div v-if="pastWeeks.length > 0" class="bg-white shadow-lg p-4 mb-6">
      <h2 class="text-2xl font-bold text-gray-800 mb-3 flex items-center">
        <span class="w-3 h-3 bg-gray-500 mr-2" />
        {{ $t('league.summary.past') }}
      </h2>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        <CompetitionName
          v-for="week in pastWeeks"
          :key="week.id"
          :competition="week"
          class="bg-gray-50 p-2 hover:bg-gray-100 transition-colors"
        />
      </div>
    </div>

    <div v-if="futureWeeks.length > 0" class="bg-white shadow-lg p-4">
      <h2 class="text-2xl font-bold text-gray-800 mb-3 flex items-center">
        <span class="w-3 h-3 bg-yellow-500 mr-2" />
        {{ $t('league.summary.upcoming') }}
      </h2>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        <CompetitionName
          v-for="week in futureWeeks"
          :key="week.id"
          :competition="week"
          class="bg-gray-50 p-2 hover:bg-gray-100 transition-colors"
        />
      </div>
    </div>
  </div>
</template>
