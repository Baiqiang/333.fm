<script setup lang="ts">
import { renderMentions } from '~/utils/comment'
import type { AppNotification, NotificationListResponse } from '~/utils/notification'

const user = useUser()
const unreadCount = ref(0)
const showDropdown = ref(false)
const notifications = ref<AppNotification[]>([])
const total = ref(0)
const loaded = ref(false)
const bellRef = ref()
const { t, locale } = useI18n()
const dayjs = useDayjs()

onClickOutside(bellRef, () => {
  showDropdown.value = false
})

async function fetchUnreadCount() {
  if (!user.signedIn)
    return
  try {
    const data = await useClientApi<{ count: number }>('/notifications/unread-count')
    if (data)
      unreadCount.value = data.count
  }
  catch {}
}

async function fetchNotifications() {
  try {
    const data = await useClientApi<NotificationListResponse>('/notifications?limit=10')
    if (data) {
      notifications.value = data.items
      total.value = data.total
    }
    loaded.value = true
  }
  catch {}
}

async function toggleDropdown() {
  showDropdown.value = !showDropdown.value
  if (showDropdown.value && !loaded.value)
    await fetchNotifications()
}

async function markAllRead() {
  try {
    await useClientApi('/notifications/read-all', { method: 'POST' } as any)
    unreadCount.value = 0
    notifications.value.forEach(n => n.read = true)
  }
  catch {}
}

async function markOneRead(notification: AppNotification) {
  if (notification.read)
    return
  notification.read = true
  unreadCount.value = Math.max(0, unreadCount.value - 1)
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
  return renderMentions(notification.comment.content, notification.comment.mentions, locale.value).substring(0, 80)
}

// poll for unread count
if (user.signedIn) {
  fetchUnreadCount()
  useIntervalFn(fetchUnreadCount, 30000)
}
</script>

<template>
  <div v-if="user.signedIn" ref="bellRef" class="md:relative">
    <button class="nav !px-1 relative" @click="toggleDropdown">
      <Icon name="mdi:bell-outline" size="20" />
      <span
        v-if="unreadCount > 0"
        class="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center"
      >
        {{ unreadCount > 9 ? '9+' : unreadCount }}
      </span>
    </button>

    <TransitionSlide :offset="[0, 4]">
      <div
        v-if="showDropdown"
        class="absolute right-0 top-10 bg-white text-black border border-gray-200 shadow-lg w-80 max-h-96 overflow-y-auto z-50"
      >
        <div class="flex justify-between items-center px-3 py-2 border-b border-gray-100">
          <span class="font-medium text-sm">{{ t('notification.title') }}</span>
          <button
            v-if="unreadCount > 0"
            class="text-xs text-indigo-500 hover:underline cursor-pointer"
            @click="markAllRead"
          >
            {{ t('notification.markAllRead') }}
          </button>
        </div>

        <div v-if="!loaded" class="p-4 text-center text-gray-400 text-sm">
          {{ t('loading') }}
        </div>
        <div v-else-if="notifications.length === 0" class="p-4 text-center text-gray-400 text-sm">
          {{ t('notification.empty') }}
        </div>
        <template v-else>
          <NuxtLink
            v-for="notification in notifications"
            :key="notification.id"
            :to="getNotificationLink(notification)"
            class="flex gap-2 px-3 py-2 hover:bg-gray-50 border-b border-gray-50 last:border-b-0"
            :class="{ 'bg-indigo-50': !notification.read }"
            @click="markOneRead(notification); showDropdown = false"
          >
            <img :src="notification.sourceUser?.avatarThumb" class="w-8 h-8 rounded-full shrink-0">
            <div class="flex-1 min-w-0">
              <div class="text-sm">
                <span class="font-medium">{{ localeName(notification.sourceUser?.name, locale) }}</span>
                {{ getNotificationText(notification) }}
              </div>
              <div v-if="notification.comment" class="text-xs text-gray-400 truncate">
                {{ formatCommentPreview(notification) }}
              </div>
              <div class="text-xs text-gray-300 mt-0.5">
                {{ dayjs(notification.createdAt).locale(locale).fromNow() }}
              </div>
            </div>
            <div v-if="!notification.read" class="w-2 h-2 bg-indigo-500 rounded-full shrink-0 mt-2" />
          </NuxtLink>
        </template>

        <NuxtLink
          v-if="total > 10"
          to="/user/notifications"
          class="block text-center text-xs text-indigo-500 py-2 border-t border-gray-100 hover:bg-gray-50"
          @click="showDropdown = false"
        >
          {{ t('notification.viewAll') }}
        </NuxtLink>
      </div>
    </TransitionSlide>
  </div>
</template>
