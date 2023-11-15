<script setup lang="ts">
const props = defineProps<{
  submissions?: Submission[]
}>()
const mode = ref<CompetitionMode | null>(null)
const filterSubmissions = computed(() => {
  if (mode.value === null)
    return props.submissions || []

  return props.submissions?.filter(submission => submission.mode === mode.value) || []
})
</script>

<template>
  <div>
    <select v-model="mode">
      <option :value="null">
        {{ $t('common.all') }}
      </option>
      <option :value="CompetitionMode.REGULAR">
        {{ $t('weekly.regular.label') }}
      </option>
      <option :value="CompetitionMode.UNLIMITED">
        {{ $t('weekly.unlimited.label') }}
      </option>
    </select>
    <div
      v-for="submission in filterSubmissions"
      :key="submission.id"
      class="border-t border-gray-300 pt-2 mt-2 flex flex-col md:flex-row gap-2 items-start"
    >
      <WeeklyUser :user="submission.user">
        <div v-if="submission.moves !== DNF" class="font-bold" :class="{ 'text-indigo-500': submission.mode === CompetitionMode.REGULAR, 'text-orange-500': submission.mode === CompetitionMode.UNLIMITED }">
          {{ formatResult(submission.moves) }}
        </div>
        <div v-else class="text-gray-500 font-bold">
          DNF
        </div>
      </WeeklyUser>
      <WeeklySubmission :submission="submission" />
    </div>
  </div>
</template>
