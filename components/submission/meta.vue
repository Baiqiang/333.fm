<script setup lang="ts">
const props = defineProps<{
  submission: Submission
  commentCount?: number
}>()
const emit = defineEmits<{
  toggleComments: []
}>()
const bus = useEventBus('submission')
async function act(action: 'like' | 'favorite') {
  try {
    const actedKey = (`${action}d`) as 'liked' | 'favorited'
    const { data, error } = await useApiPost<{ like: boolean, favorite: boolean }>('/user/act', {
      body: {
        id: props.submission.id,
        [action]: !props.submission[actedKey],
      },
    })
    if (error.value || !data.value)
      return

    bus.emit()
  }
  catch (e) {

  }
}
</script>

<template>
  <div class="flex max-w-xs">
    <div class="flex-1 md:flex-none flex gap-1 items-center w-20">
      <div class="cursor-pointer" @click="act('like')">
        <Icon v-if="!submission.liked" name="heroicons:heart" />
        <Icon v-if="submission.liked" name="heroicons:heart-solid" class="text-red-500" />
        {{ submission.likes }}
      </div>
    </div>
    <div class="flex-1 md:flex-none flex gap-1 items-center w-20">
      <div class="cursor-pointer" @click="act('favorite')">
        <Icon v-if="!submission.favorited" name="heroicons:star" />
        <Icon v-if="submission.favorited" name="heroicons:star-solid" class="text-yellow-500" />
        {{ submission.favorites }}
      </div>
    </div>
    <div class="flex-1 md:flex-none flex gap-1 items-center w-20">
      <div class="cursor-pointer" @click="emit('toggleComments')">
        <Icon name="heroicons:chat-bubble-left" />
        {{ commentCount || 0 }}
      </div>
    </div>
  </div>
</template>
