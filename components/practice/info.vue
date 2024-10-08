<script setup lang="ts">
const props = defineProps<{
  competition: Practice
}>()
const index = computed(() => props.competition.alias.split('-').pop())
</script>

<template>
  <div class="pt-2">
    <NuxtLink :to="competitionPath(competition)" class="col-span-12 md:col-span-6 lg:col-span-4 flex items-center gap-2 text-blue-500">
      <div>
        {{ $t('practice.index', { index }) }}
      </div>
      <UserAvatarName :user="competition.user" :link="false" />
    </NuxtLink>
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
