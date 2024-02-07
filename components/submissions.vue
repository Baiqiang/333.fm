<script setup lang="ts">
import { CompetitionMode } from '~/utils/competition'

const props = withDefaults(defineProps<{
  submissions?: Submission[]
  filterable?: boolean
  sortable?: boolean
}>(), {
  filterable: false,
  sortable: false,
})
const mode = ref<CompetitionMode | null>(null)
const sortBy = ref<string>('moves')
const filteredSubmissions = computed(() => {
  if (!props.filterable || mode.value === null)
    return props.submissions || []

  return props.submissions?.filter(submission => submission.mode === mode.value) || []
})
const filteredSortedSubmissions = computed(() => {
  if (!props.sortable)
    return filteredSubmissions.value
  switch (sortBy.value) {
    case 'moves':
      return filteredSubmissions.value.sort((a, b) => a.moves - b.moves)
    case 'createdAt':
      return filteredSubmissions.value.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    default:
      return filteredSubmissions.value
  }
})
const counts = computed(() => {
  const counts: Record<CompetitionMode | 'all', number> = {
    all: props.submissions?.length || 0,
    [CompetitionMode.REGULAR]: 0,
    [CompetitionMode.UNLIMITED]: 0,
  }
  for (const { mode } of props.submissions || [])
    counts[mode]++

  return counts
})
</script>

<template>
  <div>
    <div class="flex gap-2">
      <div v-if="filterable" class="flex gap-2 items-center">
        <div class="font-bold">
          {{ $t('common.filterBy.label') }}
        </div>
        <select v-model="mode">
          <option :value="null">
            {{ $t('common.all') }} ({{ counts.all }})
          </option>
          <option :value="CompetitionMode.REGULAR">
            {{ $t('weekly.regular.label') }} ({{ counts[CompetitionMode.REGULAR] }})
          </option>
          <option :value="CompetitionMode.UNLIMITED">
            {{ $t('weekly.unlimited.label') }} ({{ counts[CompetitionMode.UNLIMITED] }})
          </option>
        </select>
      </div>
      <div v-if="sortable" class="flex gap-2 items-center">
        <div class="font-bold">
          {{ $t('common.sortBy.label') }}
        </div>
        <select v-model="sortBy">
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
      />
    </div>
  </div>
</template>
