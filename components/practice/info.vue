<script setup lang="ts">
const props = defineProps<{
  competition: Practice
}>()
const index = computed(() => props.competition.alias.split('-').reverse()[0])
const link = computed(() => {
  const { user } = props.competition
  return `/practice/${user.wcaId || user.id}/${index.value}`
})
</script>

<template>
  <div class="pt-2">
    <NuxtLink :to="link" class="col-span-12 md:col-span-6 lg:col-span-4 flex items-center gap-2 text-blue-500">
      <div>
        {{ $t('practice.number', { number: index }) }}
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
