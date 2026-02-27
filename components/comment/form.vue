<script setup lang="ts">
import type { SubmissionComment } from '~/utils/comment'

const props = defineProps<{
  submissionId?: number
  replyTo?: SubmissionComment | null
}>()
const emit = defineEmits<{
  submitted: [comment: SubmissionComment]
  cancelReply: []
}>()

const user = useUser()
const { locale } = useI18n()
const content = ref('')
const mentionMap = ref<{ userId: number, display: string }[]>([])
const showMentionDropdown = ref(false)
const mentionQuery = ref('')
const mentionResults = ref<User[]>([])
const mentionStartIndex = ref(-1)
const mentionActiveIndex = ref(0)
const mentionListRef = ref<HTMLElement>()
const textareaRef = ref<HTMLTextAreaElement>()
const submitting = ref(false)

function scrollToActiveItem() {
  nextTick(() => {
    const list = mentionListRef.value
    if (!list)
      return
    const item = list.children[mentionActiveIndex.value] as HTMLElement | undefined
    item?.scrollIntoView({ block: 'nearest' })
  })
}

async function searchMentionUsers(query: string) {
  if (query.length < 1) {
    mentionResults.value = []
    return
  }
  try {
    const data = await useClientApi<User[]>(`/comments/search-users?q=${encodeURIComponent(query)}`)
    mentionResults.value = data || []
  }
  catch {
    mentionResults.value = []
  }
}

function handleInput(e: Event) {
  const textarea = e.target as HTMLTextAreaElement
  const value = textarea.value
  const cursorPos = textarea.selectionStart

  const textBeforeCursor = value.substring(0, cursorPos)
  const atIndex = textBeforeCursor.lastIndexOf('@')

  if (atIndex >= 0) {
    const charBeforeAt = atIndex > 0 ? textBeforeCursor[atIndex - 1] : ' '
    const textAfterAt = textBeforeCursor.substring(atIndex + 1)

    if ((charBeforeAt === ' ' || charBeforeAt === '\n' || atIndex === 0) && !textAfterAt.includes(' ')) {
      mentionQuery.value = textAfterAt
      mentionStartIndex.value = atIndex
      showMentionDropdown.value = true
      mentionActiveIndex.value = 0
      searchMentionUsers(textAfterAt)
      return
    }
  }

  showMentionDropdown.value = false
}

function selectMention(mentionUser: User) {
  const textarea = textareaRef.value
  if (!textarea)
    return

  const display = localeName(mentionUser.name, locale.value)
  const before = content.value.substring(0, mentionStartIndex.value)
  const after = content.value.substring(textarea.selectionStart)
  const mentionText = `@${display} `

  content.value = before + mentionText + after

  if (!mentionMap.value.find(m => m.userId === mentionUser.id))
    mentionMap.value.push({ userId: mentionUser.id, display })

  showMentionDropdown.value = false

  nextTick(() => {
    const newPos = before.length + mentionText.length
    textarea.setSelectionRange(newPos, newPos)
    textarea.focus()
  })
}

function buildSubmitContent(): { content: string, mentionUserIds: number[] } {
  let result = content.value.trim()
  const usedIds: number[] = []
  for (const { userId, display } of mentionMap.value) {
    const pattern = `@${display}`
    if (result.includes(pattern)) {
      result = result.replaceAll(pattern, `@[${userId}]`)
      usedIds.push(userId)
    }
  }
  return { content: result, mentionUserIds: usedIds }
}

async function submit() {
  if (!content.value.trim() || submitting.value)
    return

  submitting.value = true
  try {
    const { content: submitContent, mentionUserIds } = buildSubmitContent()
    const { data, error } = await useApiPost<SubmissionComment>('/comments', {
      body: {
        submissionId: props.submissionId,
        content: submitContent,
        replyToId: props.replyTo?.id,
        mentionUserIds,
      },
    })
    if (!error.value && data.value) {
      emit('submitted', data.value)
      content.value = ''
      mentionMap.value = []
    }
  }
  finally {
    submitting.value = false
  }
}

function handleKeydown(e: KeyboardEvent) {
  if (showMentionDropdown.value && mentionResults.value.length > 0) {
    const len = mentionResults.value.length
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      mentionActiveIndex.value = (mentionActiveIndex.value + 1) % len
      scrollToActiveItem()
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      mentionActiveIndex.value = (mentionActiveIndex.value - 1 + len) % len
      scrollToActiveItem()
      return
    }
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault()
      selectMention(mentionResults.value[mentionActiveIndex.value])
      return
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      showMentionDropdown.value = false
      return
    }
  }
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault()
    submit()
  }
}
</script>

<template>
  <div v-if="user.signedIn" class="mt-2 pb-2">
    <div v-if="replyTo" class="text-xs text-gray-500 mb-1 flex items-center gap-1">
      <Icon name="mdi:reply" size="14" class="rotate-180" />
      {{ $t('comment.replyingTo') }}
      <UserName :user="replyTo.user" class="text-blue-500" />
      <button class="text-gray-400 hover:text-red-500 cursor-pointer" @click="emit('cancelReply')">
        <Icon name="mdi:close" size="14" />
      </button>
    </div>
    <div class="relative">
      <textarea
        ref="textareaRef"
        v-model="content"
        class="w-full border border-gray-300 px-3 py-2 text-sm resize-none focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-opacity-50 focus:ring-indigo-200"
        rows="2"
        :placeholder="$t('comment.placeholder')"
        @input="handleInput"
        @keydown="handleKeydown"
      />
      <div
        v-if="showMentionDropdown && mentionResults.length > 0"
        ref="mentionListRef"
        class="absolute z-50 bg-white border border-gray-200 shadow-lg max-h-40 overflow-y-auto w-60"
      >
        <button
          v-for="(mentionUser, idx) in mentionResults"
          :key="mentionUser.id"
          class="flex items-center gap-2 w-full px-3 py-1.5 text-sm cursor-pointer text-left"
          :class="idx === mentionActiveIndex ? 'bg-indigo-100' : 'hover:bg-indigo-50'"
          @mousedown.prevent="selectMention(mentionUser)"
          @mouseenter="mentionActiveIndex = idx"
        >
          <img :src="mentionUser.avatarThumb" class="w-5 h-5 rounded-full">
          <span class="truncate">{{ localeName(mentionUser.name, locale) }}</span>
          <span v-if="mentionUser.wcaId" class="text-xs text-gray-400">{{ mentionUser.wcaId }}</span>
        </button>
      </div>
    </div>
    <div class="flex justify-between items-center mt-1">
      <span class="text-xs text-gray-400">
        {{ $t('comment.mentionTip') }}
      </span>
      <button
        class="bg-indigo-500 text-white text-sm px-3 py-1 hover:bg-indigo-600 disabled:opacity-50 cursor-pointer shadow-md hover:shadow-lg transition-all duration-200"
        :disabled="!content.trim() || submitting"
        @click="submit"
      >
        {{ $t('comment.submit') }}
      </button>
    </div>
  </div>
  <div v-else class="mt-2 text-sm text-gray-400">
    {{ $t('common.signingToJoin') }}
  </div>
</template>
