<script setup lang="ts">
import { CompetitionMode } from '~/utils/competition'

const props = withDefaults(defineProps<{
  submissions?: Submission[]
  scramble?: Scramble
  competition?: Competition
  user?: User
  filterable?: boolean
  filters?: { key: CompetitionMode | string, label: string, filter?: (submission: Submission) => boolean }[]
  sortable?: boolean
  chain?: boolean
}>(), {
  filterable: false,
  sortable: false,
  chain: false,
})
const { t } = useI18n()
const settings = useLocalStorage('submissions.settings', {
  filterBy: null,
  sortBy: props.chain ? 'continuances' : 'moves',
  expanded: false,
}, {
  initOnMounted: true,
})
const submissionFilters = computed(() => {
  return props.filters || [
    {
      key: CompetitionMode.REGULAR,
      label: t('weekly.regular.label'),
    },
    {
      key: CompetitionMode.UNLIMITED,
      label: t('weekly.unlimited.label'),
    },
  ]
})
onMounted(() => {
  if (!submissionFilters.value.find(f => f.key === settings.value.filterBy)) {
    settings.value.filterBy = null
  }
})
const filteredSubmissions = computed(() => {
  if (!props.filterable || settings.value.filterBy === null)
    return props.submissions || []

  const filter = submissionFilters.value.find(f => f.key === settings.value.filterBy)
  if (filter)
    return props.submissions?.filter(filter.filter || (s => s.mode === settings.value.filterBy)) || []
  return props.submissions?.filter(submission => submission.mode === settings.value.filterBy) || []
})
const filteredSortedSubmissions = computed(() => {
  if (!props.sortable)
    return filteredSubmissions.value
  switch (settings.value.sortBy) {
    case 'continuances':
      return filteredSubmissions.value.slice().sort((a, b) => {
        let tmp = b.continuances - a.continuances
        if (tmp === 0)
          tmp = a.cumulativeMoves - b.cumulativeMoves
        if (tmp === 0)
          tmp = a.moves - b.moves
        return tmp
      })
    case 'best':
      return filteredSubmissions.value.slice().sort((a, b) => a.best - b.best)
    case 'moves':
      return filteredSubmissions.value.slice().sort((a, b) => {
        let tmp = a.cumulativeMoves - b.cumulativeMoves
        if (tmp === 0)
          tmp = a.moves - b.moves
        return tmp
      })
    case 'createdAt':
      return filteredSubmissions.value.slice().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    default:
      return filteredSubmissions.value
  }
})
const counts = computed(() => {
  const counts: Record<CompetitionMode | 'all' | string, number> = {
    all: props.submissions?.length || 0,
    [CompetitionMode.REGULAR]: 0,
    [CompetitionMode.UNLIMITED]: 0,
  }
  for (const { mode } of props.submissions || [])
    counts[mode]++
  for (const { key, filter } of submissionFilters.value) {
    if (filter) {
      const filtered = props.submissions?.filter(filter) || []
      counts[key] = filtered.length
    }
  }
  return counts
})
</script>

<template>
  <div>
    <div class="flex items-center flex-wrap gap-2 text-sm">
      <div v-if="filterable" class="flex gap-2 items-center">
        <div class="font-bold whitespace-nowrap flex items-center gap-1">
          <Icon name="ic:baseline-filter-list" />
          <div class="hidden md:block">
            {{ $t('common.filterBy.label') }}
          </div>
        </div>
        <select v-model="settings.filterBy" class="py-1 text-sm">
          <option :value="null">
            {{ $t('common.all') }} ({{ counts.all }})
          </option>
          <option
            v-for="filter in submissionFilters"
            :key="filter.key"
            :value="filter.key"
          >
            {{ filter.label }} ({{ counts[filter.key] }})
          </option>
        </select>
      </div>
      <div v-if="sortable" class="flex gap-2 items-center">
        <div class="font-bold whitespace-nowrap flex items-center gap-1">
          <Icon name="ic:baseline-sort" />
          <div class="hidden md:block">
            {{ $t('common.sortBy.label') }}
          </div>
        </div>
        <select v-model="settings.sortBy" class="py-1 text-sm">
          <option v-if="chain" value="continuances">
            {{ $t('common.sortBy.mostContinuations') }}
          </option>
          <option v-if="chain" value="best">
            {{ $t('chain.best') }}
          </option>
          <option value="moves">
            {{ $t('common.sortBy.fewest') }}
          </option>
          <option value="createdAt">
            {{ $t('common.sortBy.latest') }}
          </option>
        </select>
      </div>
      <div class="cursor-pointer items-center flex gap-1" @click="settings.expanded = !settings.expanded">
        {{ settings.expanded ? $t('common.collapse') : $t('common.expand') }}
        <Icon class="text-indigo-500 text-lg" :name="!settings.expanded ? 'solar:alt-arrow-down-bold' : 'solar:alt-arrow-up-bold'" />
      </div>
    </div>
    <div>
      <Submission
        v-for="submission in filteredSortedSubmissions"
        :key="submission.id"
        :submission="submission"
        :scramble="scramble"
        :competition="competition"
        :user="user"
        :chain="chain"
        :expanded="settings.expanded"
      >
        <template #extra>
          <slot name="extra" v-bind="submission" />
        </template>
      </Submission>
    </div>
  </div>
</template>
