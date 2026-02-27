<script setup lang="ts">
import { Algorithm, Cube } from 'insertionfinder'

const props = withDefaults(defineProps<{
  submission: Submission
  scramble?: Scramble
  competition?: Competition
  user?: User
  chain?: boolean
  expanded?: boolean
  alwaysExpanded?: boolean
}>(), {
  chain: false,
  alwaysExpanded: false,
})
const route = useRoute()
const { hash } = route
const location = useBrowserLocation()
const dayjs = useDayjs()
const { locale } = useI18n()
const el = ref<HTMLElement>()
const showComment = ref(props.alwaysExpanded || props.submission.competition !== undefined || props.expanded)
const showOriginal = ref(!!props.chain)
const showAttachment = ref(false)
const showCommentSection = ref(false)
const commentCount = ref(props.submission.commentCount ?? 0)
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
const isOfficialDNF = computed(() => props.submission.wcaMoves != null && props.submission.wcaMoves >= DNF)
const hasWcaMovesMatch = computed(() => {
  if (props.submission.wcaMoves == null || props.submission.wcaMoves >= DNF || props.submission.moves >= DNF)
    return null
  return props.submission.moves === props.submission.wcaMoves
})
const isTargeted = ref(false)
const hashMatch = hash.match(/^#submission-(\d+)$/)
if (hashMatch && hashMatch[1] === props.submission.id.toString())
  showComment.value = true
// support ?sid= query param from notification links
if (route.query.sid && route.query.sid === props.submission.id.toString()) {
  showComment.value = true
  showCommentSection.value = true
  isTargeted.value = true
}
const { confirm, cancel, reveal, isRevealed } = useConfirmDialog()

// scroll to targeted submission after tab switch settles
if (isTargeted.value) {
  onMounted(() => {
    const tryScroll = (attempts = 0) => {
      if (!el.value || attempts > 10)
        return
      const rect = el.value.getBoundingClientRect()
      if (rect.height === 0) {
        setTimeout(() => tryScroll(attempts + 1), 200)
        return
      }
      el.value.scrollIntoView({ behavior: 'smooth', block: 'center' })
      // setTimeout(() => isTargeted.value = false, 3000)
    }
    setTimeout(() => tryScroll(), 500)
  })
}

const formattedSolution = computed<string>(() => {
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
  if (location.value.href)
    solution.push(location.value.href)
  return solution.join('\n\n')
})
function expandAndShowAttachment() {
  showComment.value = true
  setTimeout(() => showAttachment.value = true, 100)
}
watch(() => props.expanded, (expanded) => {
  if (!props.alwaysExpanded)
    showComment.value = expanded
})
</script>

<template>
  <div
    :id="`submission-${submission.id}`"
    ref="el"
    class="border-t first:border-t-0 border-gray-300 pt-2 mt-2 transition-colors duration-1000"
    :class="{ 'border border-indigo-300': isTargeted }"
  >
    <UserAvatarInfo v-if="submission.user" :user="submission.user" class="gap-2 shrink-0">
      <template #info>
        {{ $dayjs(submission.createdAt).locale($i18n.locale).format('LLL') }}
        <slot name="extra" v-bind="submission" />
      </template>
      <SubmissionMoves :submission="submission" class="text-lg" :chain="chain" />
    </UserAvatarInfo>
    <SubmissionInfo
      v-if="submission.competition"
      :submission="submission"
    />
    <template v-if="!submission.hideSolution">
      <template v-if="!submission.user">
        <div class="text-sm text-gray-400 basis-full">
          {{ $t('weekly.results') }}
        </div>
        <SubmissionMoves :submission="submission" :chain="chain" />
      </template>
      <div v-if="submission.competition" class="text-sm text-gray-400 basis-full">
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
        <Sequence v-else :sequence="solution" class="font-mono" />
        <div v-if="!submission.verified" class="cursor-pointer" @click="reveal">
          <Icon name="mdi:alert-circle" size="16" class="text-yellow-500" />
        </div>
        <button v-if="submission.attachments?.length" class="text-indigo-500" @click="expandAndShowAttachment">
          <Icon name="ion:image" size="20" />
        </button>
        <button v-if="!isChain" class="text-indigo-500" @click="showOriginal = !showOriginal">
          <Icon
            :name="showOriginal ? 'ic:sharp-rotate-90-degrees-cw' : 'ic:sharp-rotate-90-degrees-ccw'"
            size="20"
          />
        </button>
        <button v-if="!alwaysExpanded" class="text-indigo-500" @click="showComment = !showComment">
          <Icon
            :name="showComment ? 'solar:alt-arrow-up-bold' : 'solar:alt-arrow-down-bold'"
            size="20"
          />
        </button>
        <CopyButton
          v-if="competition || submission.competition"
          :source="formattedSolution"
        />
      </div>
      <template v-if="alwaysExpanded">
        <Sequence v-if="submission.comment" :sequence="submission.comment" class="bg-gray-200 font-mono" />
        <SubmissionAttachments :attachments="submission.attachments" :show="showAttachment" @hide="showAttachment = false" />
      </template>
      <TransitionExpand v-else>
        <div v-if="showComment" class="basis-full">
          <Sequence :sequence="submission.comment" class="bg-gray-200 font-mono" />
          <SubmissionAttachments :attachments="submission.attachments" :show="showAttachment" @hide="showAttachment = false" />
        </div>
      </TransitionExpand>
      <div v-if="isOfficialDNF && submission.moves < DNF" class="text-xs text-orange-500 mt-0.5">
        <Icon name="heroicons:arrow-path-16-solid" class="text-orange-500" />
        WCA: DNF
      </div>
      <div v-else-if="hasWcaMovesMatch !== null" class="text-xs text-gray-400 mt-0.5">
        <template v-if="hasWcaMovesMatch">
          <Icon name="heroicons:check-circle-16-solid" class="text-green-500" />
        </template>
        <template v-else>
          <Icon name="heroicons:exclamation-triangle-16-solid" class="text-yellow-500" />
          WCA: {{ formatResult(submission.wcaMoves!) }}
        </template>
      </div>
      <SubmissionChainInfo v-if="isChain" :submission="submission" />
      <SubmissionMeta
        :submission="submission"
        :comment-count="commentCount"
        @toggle-comments="showCommentSection = !showCommentSection"
      />
      <CommentSection
        :submission-id="submission.id"
        :visible="showComment || alwaysExpanded"
        :open="showCommentSection"
        :initial-count="submission.commentCount"
        @count-loaded="commentCount = $event"
        @request-open="showCommentSection = true"
      />
    </template>
    <div v-if="!submission.user" class="text-xs text-gray-400">
      {{ $dayjs(submission.createdAt).locale($i18n.locale).format('LLL') }}
    </div>
  </div>
  <Teleport to="body">
    <Modal v-if="isRevealed" :cancel="cancel">
      <div class="mb-5">
        Either this solution is not a valid one or the moves is incorrect.
      </div>
      <div class="flex gap-2 justify-end">
        <button class="bg-indigo-500 hover:bg-opacity-90 text-white cursor-pointer px-2 py-1" @click="cancel">
          {{ $t('form.confirm') }}
        </button>
      </div>
    </Modal>
  </Teleport>
</template>
