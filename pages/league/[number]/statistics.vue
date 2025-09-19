<script setup lang="ts">
const { t } = useI18n()
const season = inject(SYMBOL_LEAGUE_SEASON)!
const { data } = await useApi<Result[]>(`/league/season/${season.value.number}/solves`)
const allSolves = ref<Result[]>(data.value || [])
const field = ref<string>('tier')
const direction = ref<'asc' | 'desc'>('asc')
provide(SYMBOL_FIELD, field)
provide(SYMBOL_DIRECTION, direction)
const competitionWeeks = computed(() => {
  const ret: Record<number, string> = {}
  season.value.competitions.forEach((competition) => {
    ret[competition.id] = leagueWeek(competition)
  })
  return ret
})
const tierPlayers = computed(() => {
  const allPlayerIds: Record<number, boolean> = {}
  const ret = season.value.tiers.map((tier) => {
    return {
      id: tier.id,
      name: tier.name,
      level: tier.level,
      players: tier.players.map(({ user }) => {
        allPlayerIds[user.id] = true
        return user
      }),
    }
  })
  const unassignedPlayers: Record<number, User> = {}
  for (const { user } of allSolves.value) {
    if (!allPlayerIds[user.id]) {
      unassignedPlayers[user.id] = user
    }
  }
  if (Object.keys(unassignedPlayers).length > 0) {
    ret.push({
      ...unassignedTier,
      players: Object.values(unassignedPlayers),
    })
  }
  return ret
})
const tierMaps = computed(() => {
  const ret: Record<number, Pick<LeagueTier, 'id' | 'name' | 'level'>> = {}
  tierPlayers.value.forEach((tier) => {
    tier.players.forEach((user) => {
      ret[user.id] = {
        id: tier.id,
        name: tier.name,
        level: tier.level,
      }
    })
  })
  return ret
})
const mappedSolves = computed(() => {
  const tmp: Record<string, {
    user: User
    weeksResults: Record<string, Result>
    bestMo3: number
    mean: number
    avgRank: number
  }> = {}
  const maxRanks: Record<string, number> = {}
  allSolves.value.forEach((solve) => {
    const week = competitionWeeks.value[solve.competitionId]
    maxRanks[week] = Math.max(maxRanks[week] || 0, solve.rank)
    if (!tmp[solve.userId]) {
      tmp[solve.userId] = {
        user: solve.user,
        weeksResults: {},
        bestMo3: 0,
        mean: 0,
        avgRank: 0,
      }
    }
    tmp[solve.userId].weeksResults[week] = solve
    if (solve.average < tmp[solve.userId].bestMo3 || tmp[solve.userId].bestMo3 === 0) {
      tmp[solve.userId].bestMo3 = solve.average
    }
  })
  for (const solves of Object.values(tmp)) {
    const nonDNFSolves = Object.values(solves.weeksResults).map(r => r.values).flat().filter(v => v > 0 && v < DNF)
    if (nonDNFSolves.length >= 3) {
      solves.mean = aoN(nonDNFSolves, 0, true)
    }
    solves.avgRank = aoN(Object.entries(maxRanks).map(([week, rank]) => solves.weeksResults[week]?.rank || rank), 0, true)
  }
  const ret = Object.values(tmp)
  const sortingField = field.value
  ret.sort((a, b) => {
    if (sortingField === 'tier') {
      const tierA = tierMaps.value[a.user.id]
      const tierB = tierMaps.value[b.user.id]
      if (!tierA) {
        return 1
      }
      if (!tierB) {
        return -1
      }
      return tierA.level - tierB.level
    }
    else {
      const tmpA = getValue<number>(a, sortingField)
      const tmpB = getValue<number>(b, sortingField)
      if (!tmpA) {
        return 1
      }
      if (!tmpB) {
        return -1
      }
      return tmpA - tmpB
    }
  })
  if (direction.value === 'desc') {
    ret.reverse()
  }
  return ret
})
const maxWeek = computed(() => {
  return season.value.competitions.filter(c => isInStatus(c, CompetitionStatus.ENDED)).length
})
useSeoMeta({
  title: `${t('league.nav.statistics')} - ${season.value.title}`,
})
</script>

<template>
  <div class="px-2 overflow-x-auto w-full">
    <Heading1>
      {{ $t('league.nav.statistics') }}
    </Heading1>
    <div class="shadow overflow-x-auto w-full h-screen overflow-y-auto mb-4">
      <div class="grid grid-cols-[max-content_max-content_max-content_max-content_max-content_1fr]">
        <div class="grid grid-cols-subgrid col-span-full bg-indigo-600 text-white sticky top-0 z-10">
          <SortingField
            class="p-2 font-semibold tracking-wide text-center content-center"
            default-direction="asc"
            name="tier"
            :label="$t('league.statistics.tier')"
          />
          <div class="border-l border-r border-indigo-400 p-2 font-medium md:sticky left-0 bg-indigo-600 content-center">
            {{ $t('league.standing.competitors') }}
          </div>
          <SortingField
            class="p-2 font-medium content-center w-16 break-words text-xs"
            name="bestMo3"
            :label="$t('league.standing.bestMo3')"
          />
          <SortingField
            class="border-l border-indigo-400 p-2 text-sm"
            name="mean"
            :label="$t('result.mean')"
          />
          <SortingField
            class="p-2 font-medium content-center border-l w-16 break-words text-xs"
            name="avgRank"
            :label="$t('league.statistics.avgRank')"
          />
          <div v-if="maxWeek > 0" class="font-medium flex">
            <div v-for="week in maxWeek" :key="week" class="border-l border-indigo-400 text-center w-[18rem]">
              <div class="border-b border-indigo-400 p-2">
                Week {{ week }}
              </div>
              <div class="flex">
                <SortingField
                  class="border-indigo-400 p-2 text-sm w-14"
                  :name="`weeksResults.${week}.rank`"
                  :label="$t('result.rank')"
                />
                <SortingField
                  v-for="i in 3"
                  :key="i"
                  class="border-l border-indigo-400 p-2 w-14 text-sm"
                  :name="`weeksResults.${week}.values.${i - 1}`"
                  :label="`A${i}`"
                />
                <SortingField
                  class="border-l border-indigo-400 p-2 text-sm w-16"
                  :name="`weeksResults.${week}.average`"
                  :label="$t('result.mean')"
                />
              </div>
            </div>
          </div>
        </div>
        <div
          v-for="{ user, weeksResults, bestMo3, mean, avgRank } in mappedSolves"
          :key="user.id"
          class="grid grid-cols-subgrid col-span-full"
        >
          <div class="border-t border-gray-200 content-center text-center px-2" :class="tierBackgrounds[tierMaps[user.id]?.level]">
            {{ tierMaps[user.id]?.name }}
          </div>
          <UserAvatarName :user="user" class="p-2 border-l border-r border-gray-200 md:sticky left-0 bg-gray-50" />
          <ColoredMoves
            class="p-2 text-center font-mono font-bold"
            :value="bestMo3"
            placeholder="-"
            is-mean
          />
          <ColoredMoves
            class="p-2 text-center font-mono border-l bg-gray-200"
            :value="mean"
            placeholder="-"
            is-mean
          />
          <div class="p-2 text-center font-mono border-l bg-gray-100">
            {{ avgRank.toFixed(2) }}
          </div>
          <div v-if="maxWeek > 0" class="text-center font-mono flex">
            <template v-for="week in maxWeek" :key="week">
              <div class="text-center p-2 w-14 bg-gray-100 border-l">
                {{ weeksResults[week]?.rank || '-' }}
              </div>
              <ColoredMoves
                v-for="value in weeksResults[week]?.values || [0, 0, 0]"
                :key="value"
                class="w-14 border-l text-center p-2"
                :value="value"
                placeholder="-"
              />
              <ColoredMoves
                class="w-16 border-l text-center py-2 bg-gray-200"
                :value="weeksResults[week]?.average"
                placeholder="-"
                is-mean
              />
            </template>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
