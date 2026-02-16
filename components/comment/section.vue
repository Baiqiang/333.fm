<script setup lang="ts">
import type { CommentListResponse, SubmissionComment } from '~/utils/comment'

const props = defineProps<{
  submissionId: number
  visible: boolean
  open: boolean
}>()

const emit = defineEmits<{
  countLoaded: [count: number]
  requestOpen: []
}>()

const INITIAL_LIMIT = 3

const comments = ref<SubmissionComment[]>([])
const previewComment = ref<SubmissionComment | null>(null)
const total = ref(0)
const commentsLoaded = ref(false)
const loadingMore = ref(false)
const expanded = ref(false)
const replyTo = ref<SubmissionComment | null>(null)
const { t } = useI18n()

async function loadCountAndPreview() {
  try {
    const data = await useClientApi<CommentListResponse>(
      `/comments/submission/${props.submissionId}?limit=1&offset=0`,
    )
    if (data) {
      total.value = data.total
      emit('countLoaded', data.total)
      if (data.items.length > 0)
        previewComment.value = data.items[0]
    }
  }
  catch {}
}

async function loadComments(limit: number, offset: number) {
  try {
    const data = await useClientApi<CommentListResponse>(
      `/comments/submission/${props.submissionId}?limit=${limit}&offset=${offset}`,
    )
    if (data) {
      if (offset === 0) {
        comments.value = data.items
      }
      else {
        const existingIds = new Set(comments.value.map(c => c.id))
        const newComments = data.items.filter(c => !existingIds.has(c.id))
        comments.value = [...newComments, ...comments.value]
      }
      total.value = data.total
      emit('countLoaded', data.total)
    }
  }
  catch {}
}

async function loadInitialComments() {
  await loadComments(INITIAL_LIMIT, 0)
  commentsLoaded.value = true
}

async function loadAll() {
  if (loadingMore.value)
    return
  loadingMore.value = true
  try {
    await loadComments(total.value, 0)
    expanded.value = true
  }
  finally {
    loadingMore.value = false
  }
}

function onCommentSubmitted(comment: SubmissionComment) {
  comments.value.push(comment)
  total.value++
  emit('countLoaded', total.value)
  replyTo.value = null
  // also update preview
  previewComment.value = comment
}

function onCommentDeleted(commentId: number) {
  comments.value = comments.value.filter(c => c.id !== commentId)
  total.value--
  emit('countLoaded', total.value)
  if (previewComment.value?.id === commentId)
    previewComment.value = comments.value.length > 0 ? comments.value[comments.value.length - 1] : null
}

function onReply(comment: SubmissionComment) {
  replyTo.value = comment
}

// always load count + preview on mount
loadCountAndPreview()

// load full comments when opened
watch(() => props.open, (isOpen) => {
  if (isOpen && !commentsLoaded.value)
    loadInitialComments()
}, { immediate: true })
</script>

<template>
  <!-- Preview mode: visible, not open, has comments -->
  <div v-if="visible && !open && previewComment" class="mt-1">
    <CommentItem
      :comment="previewComment"
      :submission-id="submissionId"
      @reply="emit('requestOpen')"
      @deleted="onCommentDeleted"
    />
    <button
      v-if="total > 1"
      class="text-xs text-blue-500 hover:underline cursor-pointer"
      @click="emit('requestOpen')"
    >
      {{ t('comment.viewAll', { count: total }) }}
    </button>
  </div>

  <!-- Full mode: open -->
  <div v-if="open" class="mt-2">
    <template v-if="commentsLoaded">
      <button
        v-if="!expanded && total > comments.length"
        class="text-xs text-blue-500 hover:underline mb-1 cursor-pointer"
        :disabled="loadingMore"
        @click="loadAll"
      >
        {{ loadingMore ? t('loading') : t('comment.viewAll', { count: total }) }}
      </button>

      <div v-if="comments.length > 0" class="divide-y divide-gray-100">
        <CommentItem
          v-for="comment in comments"
          :key="comment.id"
          :comment="comment"
          :submission-id="submissionId"
          @reply="onReply"
          @deleted="onCommentDeleted"
        />
      </div>

      <CommentForm
        :submission-id="submissionId"
        :reply-to="replyTo"
        @submitted="onCommentSubmitted"
        @cancel-reply="replyTo = null"
      />
    </template>
    <div v-else class="text-sm text-gray-400 py-2">
      {{ t('loading') }}
    </div>
  </div>
</template>
