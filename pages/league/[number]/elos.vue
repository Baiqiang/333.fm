<script setup lang="ts">
const { t } = useI18n()
const season = inject(SYMBOL_LEAGUE_SEASON)!
const field = ref<string>('tier')
const direction = ref<'asc' | 'desc'>('asc')
provide(SYMBOL_FIELD, field)
provide(SYMBOL_DIRECTION, direction)

// build userId -> User map from tiers
const userMap = computed(() => {
  const map: Record<number, User> = {}
  season.value.tiers.forEach((tier) => {
    tier.players.forEach((player) => {
      map[player.userId] = player.user
    })
  })
  return map
})

// build userId -> tier map
const tierMaps = computed(() => {
  const ret: Record<number, Pick<LeagueTier, 'id' | 'name' | 'level'>> = {}
  season.value.tiers.forEach((tier) => {
    tier.players.forEach((player) => {
      ret[player.userId] = {
        id: tier.id,
        name: tier.name,
        level: tier.level,
      }
    })
  })
  return ret
})

const weeks = computed(() => {
  const set = new Set<number>()
  season.value.eloHistories?.forEach(h => set.add(h.week))
  return [...set].sort((a, b) => a - b)
})

const maxWeek = computed(() => weeks.value.length > 0 ? weeks.value[weeks.value.length - 1] : 0)

interface UserElo {
  user: User
  currentElo: number
  history: Record<number, { points: number, delta: number }>
}

const sortedElos = computed(() => {
  const tmp: Record<number, UserElo> = {}
  season.value.eloHistories?.forEach((h) => {
    if (!tmp[h.userId]) {
      tmp[h.userId] = {
        user: userMap.value[h.userId],
        currentElo: season.value.elos[h.userId] ?? 0,
        history: {},
      }
    }
    tmp[h.userId].history[h.week] = { points: h.points, delta: h.delta }
  })

  const ret = Object.values(tmp).filter(e => e.user)
  const sortingField = field.value
  ret.sort((a, b) => {
    if (sortingField === 'tier') {
      const tierA = tierMaps.value[a.user.id]
      const tierB = tierMaps.value[b.user.id]
      if (!tierA)
        return 1
      if (!tierB)
        return -1
      return tierA.level - tierB.level
    }
    else {
      const tmpA = getValue<number>(a, sortingField)
      const tmpB = getValue<number>(b, sortingField)
      if (!tmpA)
        return 1
      if (!tmpB)
        return -1
      return tmpA - tmpB
    }
  })
  if (direction.value === 'desc') {
    ret.reverse()
  }
  return ret
})

function deltaClass(delta: number) {
  if (delta > 0)
    return 'text-green-600'
  if (delta < 0)
    return 'text-red-600'
  return 'text-gray-400'
}

function formatDelta(delta: number) {
  if (delta > 0)
    return `+${delta}`
  return `${delta}`
}

useSeoMeta({
  title: `${t('league.nav.elos')} - ${season.value.title}`,
})
</script>

<template>
  <div class="px-2 overflow-x-auto w-full">
    <Heading1>
      {{ $t('league.nav.elos') }}
    </Heading1>
    <div class="shadow overflow-x-auto w-full h-screen overflow-y-auto mb-4">
      <div class="grid grid-cols-[max-content_max-content_max-content_1fr]">
        <!-- Header -->
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
            class="border-l border-indigo-400 p-2 font-medium content-center"
            default-direction="desc"
            name="currentElo"
            label="ELO"
          />
          <div v-if="maxWeek > 0" class="font-medium flex">
            <div v-for="week in weeks" :key="week" class="border-l border-indigo-400 text-center w-24">
              <div class="border-b border-indigo-400 p-2">
                W{{ week }}
              </div>
              <div class="flex">
                <SortingField
                  class="border-indigo-400 p-2 text-sm w-12"
                  :name="`history.${week}.points`"
                  label="ELO"
                  default-direction="desc"
                />
                <SortingField
                  class="border-l border-indigo-400 p-2 text-sm w-12"
                  :name="`history.${week}.delta`"
                  label="+/-"
                  default-direction="desc"
                />
              </div>
            </div>
          </div>
        </div>
        <!-- Body -->
        <div
          v-for="elo in sortedElos"
          :key="elo.user.id"
          class="grid grid-cols-subgrid col-span-full hover:bg-gray-100 transition-colors"
        >
          <div class="border-t border-gray-200 content-center text-center px-2" :class="tierBackgrounds[tierMaps[elo.user.id]?.level]">
            {{ tierMaps[elo.user.id]?.name }}
          </div>
          <UserAvatarName :user="elo.user" class="p-2 border-l border-r border-gray-200 md:sticky left-0" />
          <div class="p-2 border-l border-gray-200 text-center font-mono font-bold content-center">
            {{ elo.currentElo }}
          </div>
          <div v-if="maxWeek > 0" class="text-center font-mono flex">
            <template v-for="week in weeks" :key="week">
              <div class="w-12 border-l border-gray-200 p-2 text-sm">
                {{ elo.history[week]?.points ?? '-' }}
              </div>
              <div
                class="w-12 border-l border-gray-200 p-2 text-xs font-semibold"
                :class="elo.history[week] ? deltaClass(elo.history[week].delta) : 'text-gray-300'"
              >
                {{ elo.history[week] ? formatDelta(elo.history[week].delta) : '-' }}
              </div>
            </template>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
