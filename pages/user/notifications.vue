<script setup lang="ts">
import { renderMentions } from '~/utils/comment'
import type { AppNotification, NotificationListResponse } from '~/utils/notification'

definePageMeta({
  middleware: 'auth',
})

const { t, locale } = useI18n()
const dayjs = useDayjs()
const notifications = ref<AppNotification[]>([])
const total = ref(0)
const page = ref(1)
const limit = 20
const loading = ref(false)

async function fetchNotifications() {
  loading.value = true
  try {
    const offset = (page.value - 1) * limit
    const data = await useClientApi<NotificationListResponse>(
      `/notifications?limit=${limit}&offset=${offset}`,
    )
    if (data) {
      notifications.value = data.items
      total.value = data.total
    }
  }
  finally {
    loading.value = false
  }
}

async function markAllRead() {
  try {
    await useClientApi('/notifications/read-all', { method: 'POST' } as any)
    notifications.value.forEach(n => n.read = true)
  }
  catch {}
}

async function markOneRead(notification: AppNotification) {
  if (notification.read)
    return
  notification.read = true
  try {
    await useClientApi('/notifications/read', { method: 'POST', body: { ids: [notification.id] } } as any)
  }
  catch {}
}

function getNotificationText(notification: AppNotification) {
  switch (notification.type) {
    case NotificationType.COMMENT:
      return t('notification.commented')
    case NotificationType.REPLY:
      return t('notification.replied')
    case NotificationType.MENTION:
      return t('notification.mentioned')
    case NotificationType.LIKE:
      return t('notification.liked')
    case NotificationType.FAVORITE:
      return t('notification.favorited')
    default:
      return ''
  }
}

function getNotificationLink(notification: AppNotification) {
  if (notification.submission?.competition) {
    const { competition, scramble } = notification.submission
    return submissionLink(competition, scramble, notification.submission)
  }
  return '#'
}

function formatCommentPreview(notification: AppNotification) {
  if (!notification.comment)
    return ''
  return renderMentions(notification.comment.content, notification.comment.mentions, locale.value).substring(0, 200)
}

const totalPages = computed(() => Math.ceil(total.value / limit))

watch(page, fetchNotifications)
fetchNotifications()
useSeoMeta({
  title: t('notification.title'),
})
</script>

<template>
  <div class="max-w-2xl mx-auto py-4">
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-xl font-bold">
        {{ t('notification.title') }}
      </h2>
      <button
        class="text-sm text-indigo-500 hover:underline cursor-pointer"
        @click="markAllRead"
      >
        {{ t('notification.markAllRead') }}
      </button>
    </div>

    <div v-if="loading" class="text-center text-gray-400 py-8">
      {{ t('loading') }}
    </div>

    <div v-else-if="notifications.length === 0" class="text-center text-gray-400 py-8">
      {{ t('notification.empty') }}
    </div>

    <div v-else class="space-y-1">
      <NuxtLink
        v-for="notification in notifications"
        :key="notification.id"
        :to="getNotificationLink(notification)"
        class="flex gap-3 p-3 hover:bg-gray-50 border border-gray-100"
        :class="{ 'bg-indigo-50 border-indigo-100': !notification.read }"
        @click="markOneRead(notification)"
      >
        <img :src="notification.sourceUser?.avatarThumb" class="w-10 h-10 rounded-full shrink-0">
        <div class="flex-1 min-w-0">
          <div class="text-sm">
            <span class="font-medium">{{ localeName(notification.sourceUser?.name, locale) }}</span>
            {{ getNotificationText(notification) }}
          </div>
          <div v-if="notification.comment" class="text-sm text-gray-500 mt-1 line-clamp-2">
            {{ formatCommentPreview(notification) }}
          </div>
          <div class="text-xs text-gray-400 mt-1">
            {{ dayjs(notification.createdAt).locale(locale).fromNow() }}
          </div>
        </div>
        <div v-if="!notification.read" class="w-2 h-2 bg-indigo-500 rounded-full shrink-0 mt-2" />
      </NuxtLink>
    </div>

    <!-- Pagination -->
    <div v-if="totalPages > 1" class="flex justify-center gap-2 mt-4">
      <button
        class="px-3 py-1 text-sm border cursor-pointer"
        :class="page <= 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'"
        :disabled="page <= 1"
        @click="page--"
      >
        {{ $t('notification.prev') }}
      </button>
      <span class="px-3 py-1 text-sm text-gray-500">{{ page }} / {{ totalPages }}</span>
      <button
        class="px-3 py-1 text-sm border cursor-pointer"
        :class="page >= totalPages ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'"
        :disabled="page >= totalPages"
        @click="page++"
      >
        {{ $t('notification.next') }}
      </button>
    </div>
  </div>
</template>
