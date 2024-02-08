<script setup lang="ts">
const props = defineProps<{
  submission: Submission
}>()
const showComment = ref(props.submission.competition !== undefined)
const showOriginal = ref(false)
const solution = computed(() => {
  if (showOriginal.value)
    return props.submission.solution

  try {
    return formatAlgorithm(props.submission.solution)
  }
  catch (error) {
    return props.submission.solution.replaceAll('\n', ' ')
  }
})
</script>

<template>
  <div class="border-t first:border-t-0 border-gray-300 pt-2 mt-2">
    <UserAvatarInfo v-if="submission.user" :user="submission.user" class="gap-2 shrink-0">
      <template #info>
        {{ $dayjs(submission.createdAt).locale($i18n.locale).format('LLL') }}
      </template>
      <SubmissionMoves :submission="submission" class="text-lg" />
    </UserAvatarInfo>
    <SubmissionInfo
      v-if="submission.competition"
      :submission="submission"
    />
    <template v-if="!submission.hideSolution">
      <template v-if="!submission.user">
        <div class="text-sm text-gray-600 basis-full">
          {{ $t('weekly.results') }}
        </div>
        <SubmissionMoves :submission="submission" />
      </template>
      <div v-if="submission.competition" class="text-sm text-gray-600 basis-full">
        {{ $t('weekly.solution.label') }}
      </div>
      <div class="flex gap-2 justify-start items-start">
        <Sequence :sequence="solution" />
        <button class="text-indigo-500" @click="showOriginal = !showOriginal">
          <Icon
            :name="showOriginal ? 'ic:sharp-rotate-90-degrees-cw' : 'ic:sharp-rotate-90-degrees-ccw'"
            size="20"
          />
        </button>
        <button class="text-indigo-500" @click="showComment = !showComment">
          <Icon
            :name="showComment ? 'solar:alt-arrow-up-bold' : 'solar:alt-arrow-down-bold'"
            size="20"
          />
        </button>
      </div>
      <TransitionExpand>
        <div v-if="showComment" class="basis-full">
          <Sequence :sequence="submission.comment" class="bg-gray-200" />
        </div>
      </TransitionExpand>
      <SubmissionMeta :submission="submission" />
    </template>
    <div v-if="!submission.user" class="text-xs text-gray-400">
      {{ $dayjs(submission.createdAt).locale($i18n.locale).format('LLL') }}
    </div>
  </div>
</template>
