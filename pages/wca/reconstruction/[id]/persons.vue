<script setup lang="ts">
const { t } = useI18n()
const route = useRoute()
const wcaCompetition = inject(SYMBOL_WCA_COMPETITION)
const wcaCompetitionId = computed(() => route.params.id as string)

const { data: reconData } = await useApi<WcaReconstructionCompetitionData>(`wca/reconstruction/${wcaCompetitionId.value}`)

const displayName = computed(() => wcaCompetition?.value?.name ?? wcaCompetitionId.value)

const submissionCountByUser = computed(() => {
  const map: Record<number, number> = {}
  for (const submissions of Object.values(reconData.value?.submissions ?? {})) {
    for (const s of submissions) {
      map[s.userId] = (map[s.userId] ?? 0) + 1
    }
  }
  return map
})

const sortedRecons = computed(() => {
  if (!reconData.value)
    return []
  return [...reconData.value.recons].sort((a, b) => {
    if (a.isParticipant !== b.isParticipant)
      return a.isParticipant ? -1 : 1
    return (submissionCountByUser.value[b.userId] ?? 0) - (submissionCountByUser.value[a.userId] ?? 0)
  })
})

useSeoMeta({
  title: computed(() => `${t('wca.recon.viewByPerson')} - ${t('wca.recon.title')} - ${displayName.value}`),
})
</script>

<template>
  <div>
    <h1 class="text-3xl font-bold my-2">
      {{ displayName }}
    </h1>

    <div class="flex items-center gap-2 my-3">
      <div class="inline-flex rounded-lg bg-gray-100 p-0.5 text-sm">
        <NuxtLink
          :to="`/wca/reconstruction/${wcaCompetitionId}`"
          class="px-3 py-1 rounded-md text-gray-600 hover:text-gray-900 flex items-center gap-1"
        >
          <Icon name="heroicons:queue-list-16-solid" />
          {{ t('wca.recon.viewByScramble') }}
        </NuxtLink>
        <span class="px-3 py-1 rounded-md bg-indigo-500 text-white font-medium flex items-center gap-1">
          <Icon name="heroicons:users-16-solid" />
          {{ t('wca.recon.viewByPerson') }} ({{ sortedRecons.length }})
        </span>
      </div>
    </div>

    <div v-if="reconData">
      <div v-if="sortedRecons.length === 0" class="text-sm text-gray-400 italic py-4">
        {{ t('wca.recon.noRecons') }}
      </div>
      <NuxtLink
        v-for="recon in sortedRecons"
        :key="recon.id"
        :to="`/wca/reconstruction/${wcaCompetitionId}/${recon.user.wcaId || recon.user.id}`"
        class="border-t first:border-t-0 border-gray-300 pt-2 px-2 mt-2 flex gap-2 items-center hover:bg-gray-50"
      >
        <img :src="recon.user.avatarThumb || '/images/default-avatar.png'" class="w-8 h-8" :title="recon.user.name">
        <div class="flex-1 overflow-hidden">
          <div class="text-blue-500 text-ellipsis overflow-hidden whitespace-nowrap font-medium">
            {{ recon.user.name }}
          </div>
          <div class="text-gray-400 text-xs flex items-center gap-2">
            <span>{{ t('wca.recon.reconCount', { count: submissionCountByUser[recon.userId] ?? 0 }) }}</span>
            <span v-if="!recon.isParticipant" class="text-gray-400">{{ t('wca.recon.unofficial') }}</span>
          </div>
        </div>
        <div v-if="recon.description" class="hidden md:block text-xs text-gray-400 max-w-xs truncate">
          {{ recon.description }}
        </div>
        <Icon name="heroicons:chevron-right-16-solid" class="text-gray-300" />
      </NuxtLink>
    </div>
  </div>
</template>
