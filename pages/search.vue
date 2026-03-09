<script setup lang="ts">
const { t } = useI18n()
const route = useRoute()
const router = useRouter()

const query = ref((route.query.q as string) || '')
const mode = ref<'simple' | 'advanced'>(route.query.mode === 'advanced' ? 'advanced' : 'simple')
const advancedTab = ref<'submissions' | 'scrambles' | 'competitions'>(
  (['submissions', 'scrambles', 'competitions'] as const).includes(route.query.tab as any)
    ? (route.query.tab as 'submissions' | 'scrambles' | 'competitions')
    : 'submissions',
)

interface SimpleResults {
  users: User[]
  submissions: Submission[]
  scrambles: (Scramble & { competition: Competition })[]
  competitions: Competition[]
}

const simpleResults = ref<SimpleResults>({ users: [], submissions: [], scrambles: [], competitions: [] })
const simpleLoading = ref(false)

const advSubmissions = ref<Submission[]>([])
const advSubmissionsMeta = usePaginationMeta()
const advScrambles = ref<(Scramble & { competition: Competition })[]>([])
const advScramblesMeta = usePaginationMeta()
const advCompetitions = ref<Competition[]>([])
const advCompetitionsMeta = usePaginationMeta()
const advLoading = ref(false)

const minMoves = ref<number | undefined>(route.query.minMoves ? Number(route.query.minMoves) : undefined)
const maxMoves = ref<number | undefined>(route.query.maxMoves ? Number(route.query.maxMoves) : undefined)
const startDate = ref((route.query.startDate as string) || '')
const endDate = ref((route.query.endDate as string) || '')
const competitionType = ref<number | undefined>(route.query.type !== undefined ? Number(route.query.type) : undefined)
const sortBy = ref<'moves' | 'createdAt'>((route.query.sortBy as any) === 'moves' ? 'moves' : 'createdAt')
const sortOrder = ref<'ASC' | 'DESC'>((route.query.sortOrder as any) === 'ASC' ? 'ASC' : 'DESC')

const competitionTypes = [
  { value: undefined, label: t('common.all') },
  { value: CompetitionType.WEEKLY, label: 'Weekly' },
  { value: CompetitionType.DAILY, label: 'Daily' },
  { value: CompetitionType.LEAGUE, label: 'League' },
  { value: CompetitionType.PERSONAL_PRACTICE, label: 'Practice' },
  { value: CompetitionType.WCA_RECONSTRUCTION, label: 'WCA' },
]

function buildQuery(extra: Record<string, any> = {}) {
  const q: Record<string, string> = {}
  if (query.value.trim())
    q.q = query.value.trim()
  if (mode.value !== 'simple')
    q.mode = mode.value
  if (mode.value === 'advanced') {
    q.tab = advancedTab.value
    if (startDate.value)
      q.startDate = startDate.value
    if (endDate.value)
      q.endDate = endDate.value
    if (advancedTab.value === 'submissions') {
      if (minMoves.value !== undefined && minMoves.value !== null)
        q.minMoves = String(minMoves.value)
      if (maxMoves.value !== undefined && maxMoves.value !== null)
        q.maxMoves = String(maxMoves.value)
      if (sortBy.value !== 'createdAt')
        q.sortBy = sortBy.value
      if (sortOrder.value !== 'DESC')
        q.sortOrder = sortOrder.value
    }
    if (advancedTab.value === 'competitions' && competitionType.value !== undefined)
      q.type = String(competitionType.value)
  }
  if (extra.page && extra.page > 1)
    q.page = String(extra.page)
  return q
}

async function doSimpleSearch() {
  const q = query.value.trim()
  if (!q)
    return
  router.replace({ query: buildQuery() })
  simpleLoading.value = true
  try {
    const { data } = await useApi<SimpleResults>('/search', {
      params: { q },
    })
    if (data.value) {
      simpleResults.value = data.value
    }
  }
  finally {
    simpleLoading.value = false
  }
}

async function doAdvancedSubmissionSearch(page = 1) {
  router.replace({ query: buildQuery({ page }) })
  advLoading.value = true
  try {
    const params: Record<string, any> = { page, limit: DEFAULT_LIMIT }
    if (query.value.trim())
      params.q = query.value.trim()
    if (minMoves.value !== undefined && minMoves.value !== null)
      params.minMoves = minMoves.value
    if (maxMoves.value !== undefined && maxMoves.value !== null)
      params.maxMoves = maxMoves.value
    if (startDate.value)
      params.startDate = startDate.value
    if (endDate.value)
      params.endDate = endDate.value
    params.sortBy = sortBy.value
    params.sortOrder = sortOrder.value

    const { data } = await useApi<Pagination<Submission>>('/search/submissions', { params })
    if (data.value) {
      advSubmissions.value = data.value.items
      advSubmissionsMeta.value = data.value.meta
    }
  }
  finally {
    advLoading.value = false
  }
}

async function doAdvancedScrambleSearch(page = 1) {
  router.replace({ query: buildQuery({ page }) })
  advLoading.value = true
  try {
    const params: Record<string, any> = { page, limit: DEFAULT_LIMIT }
    if (query.value.trim())
      params.q = query.value.trim()
    if (startDate.value)
      params.startDate = startDate.value
    if (endDate.value)
      params.endDate = endDate.value

    const { data } = await useApi<Pagination<Scramble & { competition: Competition }>>('/search/scrambles', { params })
    if (data.value) {
      advScrambles.value = data.value.items
      advScramblesMeta.value = data.value.meta
    }
  }
  finally {
    advLoading.value = false
  }
}

async function doAdvancedCompetitionSearch(page = 1) {
  router.replace({ query: buildQuery({ page }) })
  advLoading.value = true
  try {
    const params: Record<string, any> = { page, limit: DEFAULT_LIMIT }
    if (query.value.trim())
      params.q = query.value.trim()
    if (competitionType.value !== undefined)
      params.type = competitionType.value
    if (startDate.value)
      params.startDate = startDate.value
    if (endDate.value)
      params.endDate = endDate.value

    const { data } = await useApi<Pagination<Competition>>('/search/competitions', { params })
    if (data.value) {
      advCompetitions.value = data.value.items
      advCompetitionsMeta.value = data.value.meta
    }
  }
  finally {
    advLoading.value = false
  }
}

function handleSearch() {
  if (mode.value === 'simple')
    doSimpleSearch()
  else
    doAdvancedSearch()
}

function doAdvancedSearch(page = 1) {
  if (advancedTab.value === 'submissions')
    doAdvancedSubmissionSearch(page)
  else if (advancedTab.value === 'scrambles')
    doAdvancedScrambleSearch(page)
  else
    doAdvancedCompetitionSearch(page)
}

function switchToAdvanced(tab: 'submissions' | 'scrambles' | 'competitions') {
  mode.value = 'advanced'
  advancedTab.value = tab
  doAdvancedSearch()
}

function setMode(m: 'simple' | 'advanced') {
  mode.value = m
  if (m === 'simple')
    doSimpleSearch()
  else
    doAdvancedSearch()
}

function setAdvancedTab(tab: 'submissions' | 'scrambles' | 'competitions') {
  advancedTab.value = tab
  doAdvancedSearch()
}

function setSort(by: 'moves' | 'createdAt', order: 'ASC' | 'DESC') {
  sortBy.value = by
  sortOrder.value = order
  doAdvancedSubmissionSearch()
}

const hasSimpleResults = computed(() => {
  const r = simpleResults.value
  return r.users.length > 0 || r.submissions.length > 0 || r.scrambles.length > 0 || r.competitions.length > 0
})

if (mode.value === 'simple' && route.query.q) {
  doSimpleSearch()
}
else if (mode.value === 'advanced') {
  const page = route.query.page ? Number(route.query.page) : 1
  doAdvancedSearch(page)
}

useSeoMeta({ title: t('search.title') })
</script>

<template>
  <div class="py-6 max-w-4xl mx-auto">
    <h1 class="text-2xl font-bold font-poppins mb-4">
      {{ $t('search.title') }}
    </h1>

    <form class="flex gap-2 mb-6" @submit.prevent="handleSearch">
      <input
        v-model="query"
        type="text"
        class="flex-1 block w-full shadow-xs border-gray-300 focus:ring-2 focus:border-indigo-300 focus:ring-indigo-200/50"
        :placeholder="$t('search.placeholder')"
      >
      <button type="submit" class="bg-indigo-500 hover:bg-indigo-600 text-white px-6 py-2 shadow-md hover:shadow-lg transition-all duration-200">
        <Icon name="heroicons:magnifying-glass" size="20" />
      </button>
    </form>

    <div class="flex gap-2 mb-6 border-b border-gray-300">
      <button
        class="px-4 py-2 font-medium transition-colors duration-200"
        :class="mode === 'simple' ? 'text-indigo-600 border-b-2 border-indigo-500' : 'text-gray-500 hover:text-gray-700'"
        @click="setMode('simple')"
      >
        {{ $t('search.simple') }}
      </button>
      <button
        class="px-4 py-2 font-medium transition-colors duration-200"
        :class="mode === 'advanced' ? 'text-indigo-600 border-b-2 border-indigo-500' : 'text-gray-500 hover:text-gray-700'"
        @click="setMode('advanced')"
      >
        {{ $t('search.advanced') }}
      </button>
    </div>

    <template v-if="mode === 'simple'">
      <div v-if="simpleLoading" class="text-center py-8 text-gray-500">
        <Icon name="heroicons:arrow-path" size="24" class="animate-spin" />
      </div>
      <template v-else-if="hasSimpleResults">
        <section v-if="simpleResults.users.length > 0" class="mb-6">
          <div class="flex items-center justify-between mb-2">
            <h2 class="text-lg font-bold font-poppins">
              {{ $t('search.users') }}
            </h2>
          </div>
          <div class="grid gap-2">
            <SearchUserItem v-for="user in simpleResults.users" :key="user.id" :user="user" />
          </div>
        </section>

        <section v-if="simpleResults.submissions.length > 0" class="mb-6">
          <div class="flex items-center justify-between mb-2">
            <h2 class="text-lg font-bold font-poppins">
              {{ $t('search.submissions') }}
            </h2>
            <button class="text-sm text-indigo-500 hover:text-indigo-700" @click="switchToAdvanced('submissions')">
              {{ $t('search.viewMore') }}
            </button>
          </div>
          <Submission
            v-for="s in simpleResults.submissions"
            :key="s.id"
            :submission="s"
            always-expanded
          />
        </section>

        <section v-if="simpleResults.scrambles.length > 0" class="mb-6">
          <div class="flex items-center justify-between mb-2">
            <h2 class="text-lg font-bold font-poppins">
              {{ $t('search.scrambles') }}
            </h2>
            <button class="text-sm text-indigo-500 hover:text-indigo-700" @click="switchToAdvanced('scrambles')">
              {{ $t('search.viewMore') }}
            </button>
          </div>
          <div class="grid gap-2">
            <SearchScrambleItem v-for="sc in simpleResults.scrambles" :key="sc.id" :scramble="sc" />
          </div>
        </section>

        <section v-if="simpleResults.competitions.length > 0" class="mb-6">
          <div class="flex items-center justify-between mb-2">
            <h2 class="text-lg font-bold font-poppins">
              {{ $t('search.competitions') }}
            </h2>
            <button class="text-sm text-indigo-500 hover:text-indigo-700" @click="switchToAdvanced('competitions')">
              {{ $t('search.viewMore') }}
            </button>
          </div>
          <div class="grid gap-2">
            <SearchCompetitionItem v-for="c in simpleResults.competitions" :key="c.id" :competition="c" />
          </div>
        </section>
      </template>
      <div v-else-if="route.query.q" class="text-center py-8 text-gray-500">
        {{ $t('search.noResults') }}
      </div>
    </template>

    <template v-else>
      <div class="flex gap-2 mb-4">
        <button
          class="px-3 py-1 text-sm font-medium transition-colors duration-200"
          :class="advancedTab === 'submissions' ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'"
          @click="setAdvancedTab('submissions')"
        >
          {{ $t('search.submissions') }}
        </button>
        <button
          class="px-3 py-1 text-sm font-medium transition-colors duration-200"
          :class="advancedTab === 'scrambles' ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'"
          @click="setAdvancedTab('scrambles')"
        >
          {{ $t('search.scrambles') }}
        </button>
        <button
          class="px-3 py-1 text-sm font-medium transition-colors duration-200"
          :class="advancedTab === 'competitions' ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'"
          @click="setAdvancedTab('competitions')"
        >
          {{ $t('search.competitions') }}
        </button>
      </div>

      <div v-if="advancedTab === 'submissions'" class="bg-white shadow-xs p-4 mb-4">
        <div class="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label class="block text-sm text-gray-600 mb-1">{{ $t('search.filters.minMoves') }}</label>
            <input
              v-model.number="minMoves"
              type="number"
              min="0"
              class="block w-full shadow-xs border-gray-300 focus:ring-2 focus:border-indigo-300 focus:ring-indigo-200/50"
            >
          </div>
          <div>
            <label class="block text-sm text-gray-600 mb-1">{{ $t('search.filters.maxMoves') }}</label>
            <input
              v-model.number="maxMoves"
              type="number"
              min="0"
              class="block w-full shadow-xs border-gray-300 focus:ring-2 focus:border-indigo-300 focus:ring-indigo-200/50"
            >
          </div>
          <div>
            <label class="block text-sm text-gray-600 mb-1">{{ $t('search.filters.startDate') }}</label>
            <input
              v-model="startDate"
              type="date"
              class="block w-full shadow-xs border-gray-300 focus:ring-2 focus:border-indigo-300 focus:ring-indigo-200/50"
            >
          </div>
          <div>
            <label class="block text-sm text-gray-600 mb-1">{{ $t('search.filters.endDate') }}</label>
            <input
              v-model="endDate"
              type="date"
              class="block w-full shadow-xs border-gray-300 focus:ring-2 focus:border-indigo-300 focus:ring-indigo-200/50"
            >
          </div>
        </div>
        <button
          class="mt-3 bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 text-sm shadow-md hover:shadow-lg transition-all duration-200"
          @click="doAdvancedSubmissionSearch()"
        >
          {{ $t('search.title') }}
        </button>
      </div>

      <div v-if="advancedTab === 'scrambles'" class="bg-white shadow-xs p-4 mb-4">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label class="block text-sm text-gray-600 mb-1">{{ $t('search.filters.startDate') }}</label>
            <input
              v-model="startDate"
              type="date"
              class="block w-full shadow-xs border-gray-300 focus:ring-2 focus:border-indigo-300 focus:ring-indigo-200/50"
            >
          </div>
          <div>
            <label class="block text-sm text-gray-600 mb-1">{{ $t('search.filters.endDate') }}</label>
            <input
              v-model="endDate"
              type="date"
              class="block w-full shadow-xs border-gray-300 focus:ring-2 focus:border-indigo-300 focus:ring-indigo-200/50"
            >
          </div>
        </div>
        <button
          class="mt-3 bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 text-sm shadow-md hover:shadow-lg transition-all duration-200"
          @click="doAdvancedScrambleSearch()"
        >
          {{ $t('search.title') }}
        </button>
      </div>

      <div v-if="advancedTab === 'competitions'" class="bg-white shadow-xs p-4 mb-4">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label class="block text-sm text-gray-600 mb-1">{{ $t('search.filters.type') }}</label>
            <select
              v-model="competitionType"
              class="block w-full shadow-xs border-gray-300 focus:ring-2 focus:border-indigo-300 focus:ring-indigo-200/50"
            >
              <option v-for="ct in competitionTypes" :key="String(ct.value)" :value="ct.value">
                {{ ct.label }}
              </option>
            </select>
          </div>
          <div>
            <label class="block text-sm text-gray-600 mb-1">{{ $t('search.filters.startDate') }}</label>
            <input
              v-model="startDate"
              type="date"
              class="block w-full shadow-xs border-gray-300 focus:ring-2 focus:border-indigo-300 focus:ring-indigo-200/50"
            >
          </div>
          <div>
            <label class="block text-sm text-gray-600 mb-1">{{ $t('search.filters.endDate') }}</label>
            <input
              v-model="endDate"
              type="date"
              class="block w-full shadow-xs border-gray-300 focus:ring-2 focus:border-indigo-300 focus:ring-indigo-200/50"
            >
          </div>
        </div>
        <button
          class="mt-3 bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 text-sm shadow-md hover:shadow-lg transition-all duration-200"
          @click="doAdvancedCompetitionSearch()"
        >
          {{ $t('search.title') }}
        </button>
      </div>

      <div v-if="advLoading" class="text-center py-8 text-gray-500">
        <Icon name="heroicons:arrow-path" size="24" class="animate-spin" />
      </div>
      <template v-else>
        <template v-if="advancedTab === 'submissions'">
          <div v-if="advSubmissionsMeta.totalItems > 0" class="flex items-center justify-between mb-3">
            <span class="text-sm text-gray-500">{{ $t('search.totalResults', { total: advSubmissionsMeta.totalItems }) }}</span>
            <div class="flex items-center gap-2">
              <button
                class="px-2 py-1 text-xs font-medium transition-colors duration-200"
                :class="sortBy === 'moves' ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'"
                @click="setSort('moves', sortBy === 'moves' && sortOrder === 'ASC' ? 'DESC' : 'ASC')"
              >
                {{ $t('search.sortByMoves') }} {{ sortBy === 'moves' ? (sortOrder === 'ASC' ? '↑' : '↓') : '' }}
              </button>
              <button
                class="px-2 py-1 text-xs font-medium transition-colors duration-200"
                :class="sortBy === 'createdAt' ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'"
                @click="setSort('createdAt', sortBy === 'createdAt' && sortOrder === 'DESC' ? 'ASC' : 'DESC')"
              >
                {{ $t('search.sortByDate') }} {{ sortBy === 'createdAt' ? (sortOrder === 'DESC' ? '↓' : '↑') : '' }}
              </button>
            </div>
          </div>
          <div v-if="advSubmissions.length > 0">
            <template v-for="s in advSubmissions" :key="s.id">
              <Submission
                v-if="s.competition?.type !== CompetitionType.PERSONAL_PRACTICE"
                :submission="s"
                always-expanded
              />
              <Spoiler v-else :spoiled="competitionName(s.competition, s.scramble)">
                <Submission
                  :submission="s"
                  always-expanded
                />
              </Spoiler>
            </template>
          </div>
          <div v-else-if="advSubmissionsMeta.totalItems === 0 && advSubmissionsMeta.currentPage > 0" class="text-center py-8 text-gray-500">
            {{ $t('search.noResults') }}
          </div>
          <Pagination :meta="advSubmissionsMeta" @update="doAdvancedSubmissionSearch" />
        </template>
        <template v-if="advancedTab === 'scrambles'">
          <div v-if="advScramblesMeta.totalItems > 0" class="mb-3">
            <span class="text-sm text-gray-500">{{ $t('search.totalResults', { total: advScramblesMeta.totalItems }) }}</span>
          </div>
          <div v-if="advScrambles.length > 0" class="grid gap-2">
            <SearchScrambleItem v-for="sc in advScrambles" :key="sc.id" :scramble="sc" />
          </div>
          <div v-else-if="advScramblesMeta.totalItems === 0 && advScramblesMeta.currentPage > 0" class="text-center py-8 text-gray-500">
            {{ $t('search.noResults') }}
          </div>
          <Pagination :meta="advScramblesMeta" @update="doAdvancedScrambleSearch" />
        </template>
        <template v-if="advancedTab === 'competitions'">
          <div v-if="advCompetitionsMeta.totalItems > 0" class="mb-3">
            <span class="text-sm text-gray-500">{{ $t('search.totalResults', { total: advCompetitionsMeta.totalItems }) }}</span>
          </div>
          <div v-if="advCompetitions.length > 0" class="grid gap-2">
            <SearchCompetitionItem v-for="c in advCompetitions" :key="c.id" :competition="c" />
          </div>
          <div v-else-if="advCompetitionsMeta.totalItems === 0 && advCompetitionsMeta.currentPage > 0" class="text-center py-8 text-gray-500">
            {{ $t('search.noResults') }}
          </div>
          <Pagination :meta="advCompetitionsMeta" @update="doAdvancedCompetitionSearch" />
        </template>
      </template>
    </template>
  </div>
</template>
