<script setup lang="ts">
const props = defineProps<{
  competition: Competition
  scramble: Scramble
  submissions: Submission[]
  sortable?: boolean
  filterable?: boolean
  filters?: SubmissionFilter[]
}>()
const user = useUser()
const mySubmissions = computed(() => props.submissions.filter(s => s.user.id === user.id))
const isOnGoing = computed(() => isInStatus(props.competition, CompetitionStatus.ON_GOING))
</script>

<template>
  <h2 class="text-lg font-semibold my-2">
    {{ $t('weekly.solutions') }}
  </h2>
  <div>
    <div v-if="submissions.length === 0">
      {{ $t('weekly.noSolution') }}
    </div>
    <div
      v-else-if="mySubmissions.length === 0 && isOnGoing"
    >
      {{ $t('weekly.seeSolutions', { solutions: submissions.length }, submissions.length) }}
    </div>
    <Submissions
      v-else
      :submissions="submissions"
      :competition="competition"
      :scramble="scramble"
      :filterable="filterable"
      :sortable="sortable"
      :filters="filters"
    >
      <template #extra="submission">
        <slot name="extra" v-bind="submission" />
      </template>
    </Submissions>
  </div>
</template>
