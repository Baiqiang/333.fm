<script setup lang="ts">
import type { SubmissionComment } from '~/utils/comment'
import { renderMentions } from '~/utils/comment'

const props = defineProps<{
  comment: SubmissionComment
  submissionId: number
}>()
const emit = defineEmits<{
  reply: [comment: SubmissionComment]
  deleted: [commentId: number]
}>()
const dayjs = useDayjs()
const { locale } = useI18n()
const user = useUser()

async function deleteComment() {
  try {
    await useClientApi(`/comments/${props.comment.id}`, { method: 'DELETE' } as any)
    emit('deleted', props.comment.id)
  }
  catch {}
}
</script>

<template>
  <div class="flex gap-2 py-2">
    <UserAvatar :user="comment.user" :size="8" />
    <div class="flex-1 min-w-0">
      <div class="flex items-center gap-2 text-sm">
        <NuxtLink :to="`/profile/${userId(comment.user)}`" class="font-medium text-blue-500 hover:underline">
          <UserName :user="comment.user" />
        </NuxtLink>
        <span class="text-gray-400 text-xs">
          {{ dayjs(comment.createdAt).locale(locale).fromNow() }}
        </span>
      </div>
      <div v-if="comment.replyTo" class="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
        <Icon name="mdi:reply" size="14" class="rotate-180" />
        <NuxtLink :to="`/profile/${userId(comment.replyTo.user)}`" class="text-blue-400 hover:underline">
          <UserName :user="comment.replyTo.user" />
        </NuxtLink>
        <span class="truncate max-w-48 text-gray-300">
          {{ renderMentions(comment.replyTo.content, comment.replyTo.mentions, locale).substring(0, 60) }}
        </span>
      </div>
      <div class="text-sm mt-1 whitespace-pre-wrap break-words">
        <CommentContent :content="comment.content" :mentions="comment.mentions" />
      </div>
      <div class="flex items-center gap-3 mt-1">
        <button
          v-if="user.signedIn"
          class="text-xs text-gray-400 hover:text-indigo-500 cursor-pointer"
          @click="emit('reply', comment)"
        >
          {{ $t('comment.reply') }}
        </button>
        <button
          v-if="user.id === comment.userId"
          class="text-xs text-gray-400 hover:text-red-500 cursor-pointer"
          @click="deleteComment"
        >
          {{ $t('comment.delete') }}
        </button>
      </div>
    </div>
  </div>
</template>
