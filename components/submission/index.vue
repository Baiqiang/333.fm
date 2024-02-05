<script setup lang="ts">
const props = defineProps<{
  submission: Submission
  spoiler?: boolean
}>()
const { t } = useI18n()
const showComment = ref(props.spoiler)
const showOriginal = ref(false)
const show = ref(false)
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
const name = computed(() => {
  const competition = props.submission.competition
  const scramble = props.submission.scramble
  let name = competition?.name || props.submission.id
  if (scramble) {
    switch (competition?.type) {
      case CompetitionType.WEEKLY:
        name += ` ${t('weekly.scramble', { number: scramble.number })}`
        break
      case CompetitionType.ENDLESS:
        name += ` ${t('endless.level', { level: scramble.number })}`
        break
    }
  }
  return name
})
const showSpoiler = computed(() => {
  if (!props.spoiler || show.value || props.submission.alreadySubmitted)
    return false

  if (props.submission.competition.type === CompetitionType.WEEKLY)
    return props.submission.competition.status !== CompetitionStatus.ENDED

  return true
})
</script>

<template>
  <div class="relative">
    <div
      v-if="showSpoiler"
      class="absolute inset-0 z-50 bg-indigo-500 text-white flex flex-col items-center justify-center cursor-pointer"
      @click="show = true"
    >
      {{ $t('common.spoiler', { for: name }) }}
    </div>
    <SubmissionInfo
      v-if="submission.competition"
      :competition="submission.competition"
      :scramble="submission.scramble"
      class="basis-full"
    />
    <UserAvatarName v-if="submission.user" :user="submission.user" class="gap-2 shrink-0">
      <SubmissionMoves :submission="submission" />
    </UserAvatarName>
    <SubmissionMoves v-else :submission="submission" />
    <div>
      <div class="flex gap-2 justify-start items-start">
        <Sequence :sequence="solution" />
        <button class="text-indigo-500" @click="showOriginal = !showOriginal">
          <Icon
            :name="showOriginal ? 'ic:sharp-rotate-90-degrees-cw' : 'ic:sharp-rotate-90-degrees-ccw'"
            size="20"
          />
        </button>
        <button v-if="submission.comment.trim() !== ''" class="text-indigo-500" @click="showComment = !showComment">
          <Icon
            :name="showComment ? 'solar:alt-arrow-up-bold' : 'solar:alt-arrow-down-bold'"
            size="20"
          />
        </button>
      </div>
      <TransitionExpand>
        <Sequence v-if="showComment" :sequence="submission.comment" class="bg-gray-200" />
      </TransitionExpand>
    </div>
  </div>
</template>
