<script setup lang="ts">
import type { SubmissionComment } from '~/utils/comment'
import { parseContentSegments } from '~/utils/comment'

const props = defineProps<{
  content: string
  mentions?: SubmissionComment['mentions']
}>()

const { locale } = useI18n()

const segments = computed(() => parseContentSegments(props.content, props.mentions))
</script>

<template>
  <template v-for="(seg, i) in segments" :key="i">
    <template v-if="seg.type === 'text'">
      {{ seg.text }}
    </template>
    <NuxtLink
      v-else-if="seg.user"
      :to="`/profile/${userId(seg.user)}`"
      class="text-blue-500 font-medium hover:underline"
    >
      @{{ localeName(seg.text, locale) }}
    </NuxtLink>
  </template>
</template>
