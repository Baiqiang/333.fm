<script setup lang="ts">
import { Algorithm, Cube } from 'insertionfinder'

const props = withDefaults(defineProps<{
  submission: Submission
  scramble?: Scramble
  competition?: Competition
  user?: User
  chain?: boolean
}>(), {
  chain: false,
})
const { hash } = useRoute()
const { copy, copied } = useStatefulClipboard()
const dayjs = useDayjs()
const { locale } = useI18n()
const el = ref<HTMLElement>()
const showComment = ref(props.submission.competition !== undefined)
const showOriginal = ref(!!props.chain)
const showAttachment = ref(false)
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
const status = computed(() => {
  const cube = new Cube()
  const { submission } = props
  let skeleton = ''
  if (submission.scramble)
    skeleton += submission.scramble.scramble
  if (submission.parent)
    skeleton += flattenSkeleton(submission.parent)
  skeleton += submission.solution
  cube.twist(new Algorithm(skeleton))
  return getStatus(cube, props.submission.phase)
})
const isChain = computed(() => props.chain || props.submission.competition?.type === CompetitionType.FMC_CHAIN)
const match = hash.match(/^#submission-(\d+)$/)
if (match && match[1] === props.submission.id.toString())
  showComment.value = true

function copySolution() {
  const solution = []
  const scramble = props.scramble || props.submission.scramble
  const competition = props.competition || props.submission.competition
  const user = props.user || props.submission.user
  const competitionInfo = [competition.name]
  if (competition.type === CompetitionType.WEEKLY)
    competitionInfo.push(`Scramble ${scramble?.number}`)
  if (competition.type === CompetitionType.ENDLESS)
    competitionInfo.push(`Level ${scramble?.number}`)
  solution.push(competitionInfo.join(' - '))
  solution.push(`Scramble:\n${scramble?.scramble}`)
  solution.push(`Solution:\n${props.submission.solution} (${formatResult(props.submission.moves)})`)
  solution.push(props.submission.comment)
  solution.push(`By ${user?.name}\n${dayjs(props.submission.createdAt).locale(locale.value).format('LLL')}`)
  copy(solution.join('\n\n'))
}
function expandAndShowAttachment() {
  showComment.value = true
  setTimeout(() => showAttachment.value = true, 100)
}
</script>

<template>
  <div :id="`submission-${submission.id}`" ref="el" class="border-t first:border-t-0 border-gray-300 pt-2 mt-2">
    <UserAvatarInfo v-if="submission.user" :user="submission.user" class="gap-2 shrink-0">
      <template #info>
        {{ $dayjs(submission.createdAt).locale($i18n.locale).format('LLL') }}
      </template>
      <SubmissionMoves :submission="submission" class="text-lg" :chain="chain" />
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
        <SubmissionMoves :submission="submission" :chain="chain" />
      </template>
      <div v-if="submission.competition" class="text-sm text-gray-600 basis-full">
        {{ $t('weekly.solution.label') }}
      </div>
      <div
        class="flex gap-2 justify-start items-start"
      >
        <ChainPhase
          v-if="isChain"
          :submission="submission"
          :phase="submission.phase"
          :status="status"
          comment
        />
        <Sequence v-else :sequence="solution" />
        <button v-if="submission.attachments?.length" class="text-indigo-500" @click="expandAndShowAttachment">
          <Icon name="ion:image" size="20" />
        </button>
        <button v-if="!isChain" class="text-indigo-500" @click="showOriginal = !showOriginal">
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
        <div v-if="competition || submission.competition" :class="{ 'text-indigo-500': !copied, 'text-gray-400': copied }">
          <Icon
            name="ion:ios-copy"
            class="cursor-pointer"
            @click.stop.prevent="copySolution"
          />
        </div>
      </div>
      <TransitionExpand>
        <div v-if="showComment" class="basis-full">
          <Sequence :sequence="submission.comment" class="bg-gray-200" />
          <SubmissionAttachments :attachments="submission.attachments" :show="showAttachment" @hide="showAttachment = false" />
        </div>
      </TransitionExpand>
      <SubmissionChainInfo v-if="isChain" :submission="submission" />
      <SubmissionMeta :submission="submission" />
    </template>
    <div v-if="!submission.user" class="text-xs text-gray-400">
      {{ $dayjs(submission.createdAt).locale($i18n.locale).format('LLL') }}
    </div>
  </div>
</template>
