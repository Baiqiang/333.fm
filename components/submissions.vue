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
const filterBy = ref<CompetitionMode | string | null>(null)
const sortBy = ref<string>(props.chain ? 'continuances' : 'moves')
const filteredSubmissions = computed(() => {
  if (!props.filterable || filterBy.value === null)
    return props.submissions || []

  if (props.filters) {
    const filter = props.filters.find(f => f.key === filterBy.value)
    if (filter)
      return props.submissions?.filter(filter.filter || (s => s.mode === filterBy.value)) || []
  }
  return props.submissions?.filter(submission => submission.mode === filterBy.value) || []
})
const filteredSortedSubmissions = computed(() => {
  if (!props.sortable)
    return filteredSubmissions.value
  switch (sortBy.value) {
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
  for (const { key, filter } of props.filters || []) {
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
    <div class="flex flex-wrap gap-2 text-sm">
      <div v-if="filterable" class="flex gap-2 items-center">
        <div class="font-bold whitespace-nowrap flex items-center gap-1">
          <Icon name="ic:baseline-filter-list" />
          <div class="hidden md:block">
            {{ $t('common.filterBy.label') }}
          </div>
        </div>
        <select v-model="filterBy" class="py-1 text-sm">
          <option :value="null">
            {{ $t('common.all') }} ({{ counts.all }})
          </option>
          <option
            v-for="filter in filters || [
              {
                key: CompetitionMode.REGULAR,
                label: t('weekly.regular.label'),
              },
              {
                key: CompetitionMode.UNLIMITED,
                label: t('weekly.unlimited.label'),
              },
            ]"
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
        <select v-model="sortBy" class="py-1 text-sm">
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
      >
        <template #extra>
          <slot name="extra" v-bind="submission" />
        </template>
      </Submission>
    </div>
  </div>
</template>
