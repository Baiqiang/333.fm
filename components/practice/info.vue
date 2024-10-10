<script setup lang="ts">
const props = defineProps<{
  competition: Practice
}>()
const index = computed(() => props.competition.alias.split('-').pop())
</script>

<template>
  <div class="pt-2">
    <div class="col-span-12 md:col-span-6 lg:col-span-4 flex items-center gap-2">
      <NuxtLink :to="competitionPath(competition)" class="text-blue-500">
        {{ $t('practice.index', { index }) }}
      </NuxtLink>
      <UserAvatarName :user="competition.user" />
    </div>
    <div class="flex text-sm gap-2 mt-2">
      <div>
        {{ $t(`common.${CompetitionFormat[competition.format].toLowerCase()}`) }}
      </div>
      <div>
        {{ $t('endless.progress.competitors', { competitors: competition.attendees }) }}
      </div>
      <div>
        {{ $dayjs(competition.startTime).format('YYYY-MM-DD HH:mm:ss') }}
      </div>
    </div>
  </div>
</template>
