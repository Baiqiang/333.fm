<script setup lang="ts">
const props = defineProps<{
  competition: Practice
}>()
const index = computed(() => props.competition.alias.split('-').pop())
</script>

<template>
  <div class="py-2 border-b border-gray-200 last:border-b-0 min-w-0">
    <div class="flex items-center gap-2 min-w-0">
      <NuxtLink :to="competitionPath(competition)" class="text-blue-500 hover:text-blue-600 shrink-0">
        {{ $t('practice.index', { index }) }}
      </NuxtLink>
      <UserAvatarName :user="competition.user" :size="5" class="min-w-0 text-sm [&>div]:truncate" />
    </div>
    <div class="flex flex-wrap items-center gap-x-2 mt-0.5 text-xs text-gray-500 whitespace-nowrap">
      <span>{{ $t(`common.${CompetitionFormat[competition.format].toLowerCase()}`) }}</span>
      <span class="text-gray-300">·</span>
      <span>{{ $t('endless.progress.competitors', { competitors: competition.attendees }) }}</span>
      <span class="text-gray-300">·</span>
      <DateTime :value="competition.startTime" intent="relative" />
    </div>
  </div>
</template>
