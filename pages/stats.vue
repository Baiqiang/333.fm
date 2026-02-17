<script setup lang="ts">
const { t } = useI18n()
const route = useRoute()

const TAB_KEYS = ['weeklyBestSingles', 'weeklyActiveSubmitters', 'topLiked', 'topFavorited', 'topCommented', 'topSubmitters', 'topWinners'] as const

const { data } = await useApi<{
  topLiked: Submission[]
  topFavorited: Submission[]
  topCommented: (Submission & { commentCount: number })[]
  weeklyBestSingles: { week: string, submission: Submission }[]
  weeklyActiveSubmitters: { week: string, submitters: { user: User, submissionCount: number }[] }[]
  topSubmitters: { user: User, submissionCount: number, bestSingle: number }[]
  topWinners: { user: User, wins: number }[]
}>('/stats')

const tabs = computed(() => [
  { key: 'weeklyBestSingles', label: t('stats.weeklyBestSingles'), icon: 'mdi:trophy-outline' },
  { key: 'weeklyActiveSubmitters', label: t('stats.weeklyActiveSubmitters'), icon: 'mdi:account-multiple-outline' },
  { key: 'topLiked', label: t('stats.topLiked'), icon: 'mdi:thumb-up-outline' },
  { key: 'topFavorited', label: t('stats.topFavorited'), icon: 'mdi:heart-outline' },
  { key: 'topCommented', label: t('stats.topCommented'), icon: 'mdi:comment-outline' },
  { key: 'topSubmitters', label: t('stats.topSubmitters'), icon: 'mdi:account-group-outline' },
  { key: 'topWinners', label: t('stats.topWinners'), icon: 'mdi:medal-outline' },
])

const activeTab = computed(() => {
  const q = route.query.tab
  return (typeof q === 'string' && TAB_KEYS.includes(q as any)) ? q : TAB_KEYS[0]
})

const activeTabLabel = computed(() => tabs.value.find(t => t.key === activeTab.value)?.label ?? '')

useSeoMeta({
  title: t('stats.title'),
})
</script>

<template>
  <div class="py-4">
    <Heading1>
      <Icon name="mdi:chart-bar" class="mr-1" />
      {{ $t('stats.title') }}
    </Heading1>

    <div class="my-4 overflow-x-auto overflow-y-hidden pb-2 -mx-2 px-2 md:mx-0 md:px-0">
      <div class="flex gap-2 flex-nowrap min-w-max md:flex-wrap">
        <NuxtLink
          v-for="tab in tabs"
          :key="tab.key"
          :to="{ path: '/stats', query: { tab: tab.key } }"
          :aria-label="tab.label"
          class="shrink-0 md:whitespace-nowrap p-2 md:px-3 md:py-2 text-sm font-medium transition-all duration-200 border inline-flex items-center justify-center gap-1"
          :class="activeTab === tab.key
            ? 'bg-indigo-500 text-white border-indigo-500 shadow-md'
            : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-300 hover:text-indigo-500'"
        >
          <Icon :name="tab.icon" class="shrink-0 w-5 h-5 md:w-4 md:h-4" />
          <span class="hidden md:inline">{{ tab.label }}</span>
        </NuxtLink>
      </div>
    </div>

    <h2 class="md:hidden text-lg font-bold mb-2 mt-1">
      {{ activeTabLabel }}
    </h2>

    <!-- Weekly Best Singles -->
    <div v-if="activeTab === 'weeklyBestSingles'" class="bg-white shadow-md">
      <div class="overflow-x-auto">
        <table class="w-full text-sm min-w-max [&_th]:whitespace-nowrap [&_td]:whitespace-nowrap">
          <thead class="bg-indigo-500 text-white">
            <tr>
              <th class="p-2 text-left">
                {{ $t('stats.week') }}
              </th>
              <th class="p-2 text-left">
                {{ $t('stats.competition') }}
              </th>
              <th class="p-2 text-left">
                {{ $t('common.createdBy') }}
              </th>
              <th class="p-2 text-center">
                {{ $t('stats.moves') }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="{ week, submission } in data?.weeklyBestSingles"
              :key="week"
              class="border-t border-gray-200 hover:bg-gray-50"
            >
              <td class="p-2">
                {{ week }}
              </td>
              <td class="p-2">
                <CompetitionName v-if="submission.competition" :competition="submission.competition" :scramble="submission.scramble" :submission="submission" />
                <span v-else class="text-gray-400">-</span>
              </td>
              <td class="p-2">
                <UserAvatarName v-if="submission.user" :user="submission.user" :size="5" />
              </td>
              <td class="p-2 text-center">
                <NuxtLink
                  v-if="submission.competition"
                  :to="submissionLink(submission.competition, submission.scramble, submission)"
                  class="text-blue-500 hover:text-blue-300"
                >
                  <ColoredMoves :value="submission.moves" is-best />
                </NuxtLink>
                <ColoredMoves v-else :value="submission.moves" is-best />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="!data?.weeklyBestSingles?.length" class="p-8 text-center text-gray-400">
        {{ $t('stats.noData') }}
      </div>
    </div>

    <!-- Weekly Active Submitters -->
    <div v-if="activeTab === 'weeklyActiveSubmitters'" class="bg-white shadow-md">
      <div class="overflow-x-auto">
        <table class="w-full text-sm min-w-max [&_th]:whitespace-nowrap [&_td]:whitespace-nowrap">
          <thead class="bg-indigo-500 text-white">
            <tr>
              <th class="p-2 text-left">
                {{ $t('stats.week') }}
              </th>
              <th class="p-2 text-left">
                {{ $t('stats.competitors') }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="{ week, submitters } in data?.weeklyActiveSubmitters"
              :key="week"
              class="border-t border-gray-200 hover:bg-gray-50"
            >
              <td class="p-2">
                {{ week }}
              </td>
              <td class="p-2">
                <div class="flex flex-wrap items-center gap-x-4 gap-y-1">
                  <template v-for="(item, idx) in submitters" :key="item.user?.id ?? idx">
                    <span v-if="item.user" class="flex items-center gap-1">
                      <span class="font-mono text-gray-500 w-5">{{ idx + 1 }}.</span>
                      <UserAvatarName :user="item.user" :size="5" />
                      <span class="font-mono text-gray-600">({{ item.submissionCount }})</span>
                    </span>
                  </template>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="!data?.weeklyActiveSubmitters?.length" class="p-8 text-center text-gray-400">
        {{ $t('stats.noData') }}
      </div>
    </div>

    <!-- Top Liked -->
    <div v-if="activeTab === 'topLiked'" class="bg-white shadow-md">
      <div class="overflow-x-auto">
        <table class="w-full text-sm min-w-max [&_th]:whitespace-nowrap [&_td]:whitespace-nowrap">
          <thead class="bg-indigo-500 text-white">
            <tr>
              <th class="p-2 text-center w-12">
                #
              </th>
              <th class="p-2 text-left">
                {{ $t('common.createdBy') }}
              </th>
              <th class="p-2 text-left">
                {{ $t('stats.competition') }}
              </th>
              <th class="p-2 text-center">
                {{ $t('stats.moves') }}
              </th>
              <th class="p-2 text-center">
                <Icon name="mdi:thumb-up" class="text-indigo-300" /> {{ $t('stats.likes') }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(submission, index) in data?.topLiked"
              :key="submission.id"
              class="border-t border-gray-200 hover:bg-gray-50"
            >
              <td class="p-2 text-center font-bold text-gray-500">
                {{ index + 1 }}
              </td>
              <td class="p-2">
                <UserAvatarName v-if="submission.user" :user="submission.user" :size="5" />
              </td>
              <td class="p-2">
                <CompetitionName :competition="submission.competition" :scramble="submission.scramble" :submission="submission" />
              </td>
              <td class="p-2 text-center">
                <ColoredMoves :value="submission.moves" />
              </td>
              <td class="p-2 text-center font-mono font-bold text-indigo-500">
                {{ submission.likes }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="!data?.topLiked?.length" class="p-8 text-center text-gray-400">
        {{ $t('stats.noData') }}
      </div>
    </div>

    <!-- Top Favorited -->
    <div v-if="activeTab === 'topFavorited'" class="bg-white shadow-md">
      <div class="overflow-x-auto">
        <table class="w-full text-sm min-w-max [&_th]:whitespace-nowrap [&_td]:whitespace-nowrap">
          <thead class="bg-indigo-500 text-white">
            <tr>
              <th class="p-2 text-center w-12">
                #
              </th>
              <th class="p-2 text-left">
                {{ $t('common.createdBy') }}
              </th>
              <th class="p-2 text-left">
                {{ $t('stats.competition') }}
              </th>
              <th class="p-2 text-center">
                {{ $t('stats.moves') }}
              </th>
              <th class="p-2 text-center">
                <Icon name="mdi:heart" class="text-red-300" /> {{ $t('stats.favorites') }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(submission, index) in data?.topFavorited"
              :key="submission.id"
              class="border-t border-gray-200 hover:bg-gray-50"
            >
              <td class="p-2 text-center font-bold text-gray-500">
                {{ index + 1 }}
              </td>
              <td class="p-2">
                <UserAvatarName v-if="submission.user" :user="submission.user" :size="5" />
              </td>
              <td class="p-2">
                <CompetitionName :competition="submission.competition" :scramble="submission.scramble" :submission="submission" />
              </td>
              <td class="p-2 text-center">
                <ColoredMoves :value="submission.moves" />
              </td>
              <td class="p-2 text-center font-mono font-bold text-red-500">
                {{ submission.favorites }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="!data?.topFavorited?.length" class="p-8 text-center text-gray-400">
        {{ $t('stats.noData') }}
      </div>
    </div>

    <!-- Top Commented -->
    <div v-if="activeTab === 'topCommented'" class="bg-white shadow-md">
      <div class="overflow-x-auto">
        <table class="w-full text-sm min-w-max [&_th]:whitespace-nowrap [&_td]:whitespace-nowrap">
          <thead class="bg-indigo-500 text-white">
            <tr>
              <th class="p-2 text-center w-12">
                #
              </th>
              <th class="p-2 text-left">
                {{ $t('common.createdBy') }}
              </th>
              <th class="p-2 text-left">
                {{ $t('stats.competition') }}
              </th>
              <th class="p-2 text-center">
                {{ $t('stats.moves') }}
              </th>
              <th class="p-2 text-center">
                <Icon name="mdi:comment" class="text-blue-300" /> {{ $t('stats.comments') }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(submission, index) in data?.topCommented"
              :key="submission.id"
              class="border-t border-gray-200 hover:bg-gray-50"
            >
              <td class="p-2 text-center font-bold text-gray-500">
                {{ index + 1 }}
              </td>
              <td class="p-2">
                <UserAvatarName v-if="submission.user" :user="submission.user" :size="5" />
              </td>
              <td class="p-2">
                <CompetitionName :competition="submission.competition" :scramble="submission.scramble" :submission="submission" />
              </td>
              <td class="p-2 text-center">
                <ColoredMoves :value="submission.moves" />
              </td>
              <td class="p-2 text-center font-mono font-bold text-blue-500">
                {{ submission.commentCount }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="!data?.topCommented?.length" class="p-8 text-center text-gray-400">
        {{ $t('stats.noData') }}
      </div>
    </div>

    <!-- Top Submitters -->
    <div v-if="activeTab === 'topSubmitters'" class="bg-white shadow-md">
      <div class="overflow-x-auto">
        <table class="w-full text-sm min-w-max [&_th]:whitespace-nowrap [&_td]:whitespace-nowrap">
          <thead class="bg-indigo-500 text-white">
            <tr>
              <th class="p-2 text-center w-12">
                #
              </th>
              <th class="p-2 text-left">
                {{ $t('league.standing.competitors') }}
              </th>
              <th class="p-2 text-center">
                {{ $t('stats.submissions') }}
              </th>
              <th class="p-2 text-center">
                {{ $t('stats.bestSingle') }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(item, index) in data?.topSubmitters"
              :key="item.user.id"
              class="border-t border-gray-200 hover:bg-gray-50"
            >
              <td class="p-2 text-center font-bold text-gray-500">
                {{ index + 1 }}
              </td>
              <td class="p-2">
                <UserAvatarName :user="item.user" :size="5" />
              </td>
              <td class="p-2 text-center font-mono font-bold">
                {{ item.submissionCount }}
              </td>
              <td class="p-2 text-center">
                <ColoredMoves :value="item.bestSingle" />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="!data?.topSubmitters?.length" class="p-8 text-center text-gray-400">
        {{ $t('stats.noData') }}
      </div>
    </div>

    <!-- Top Winners -->
    <div v-if="activeTab === 'topWinners'" class="bg-white shadow-md">
      <div class="overflow-x-auto">
        <table class="w-full text-sm min-w-max [&_th]:whitespace-nowrap [&_td]:whitespace-nowrap">
          <thead class="bg-indigo-500 text-white">
            <tr>
              <th class="p-2 text-center w-12">
                #
              </th>
              <th class="p-2 text-left">
                {{ $t('league.standing.competitors') }}
              </th>
              <th class="p-2 text-center">
                <Icon name="mdi:trophy" class="text-yellow-300" /> {{ $t('stats.wins') }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(item, index) in data?.topWinners"
              :key="item.user.id"
              class="border-t border-gray-200 hover:bg-gray-50"
            >
              <td class="p-2 text-center font-bold text-gray-500">
                {{ index + 1 }}
              </td>
              <td class="p-2">
                <UserAvatarName :user="item.user" :size="5" />
              </td>
              <td class="p-2 text-center font-mono font-bold text-yellow-600">
                {{ item.wins }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="!data?.topWinners?.length" class="p-8 text-center text-gray-400">
        {{ $t('stats.noData') }}
      </div>
    </div>
  </div>
</template>
