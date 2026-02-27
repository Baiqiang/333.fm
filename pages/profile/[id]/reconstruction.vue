<script setup lang="ts">
const { t } = useI18n()
const route = useRoute()
const dayjs = useDayjs()
const { locale } = useI18n()
const user = inject(SYMBOL_USER)!

const { data: items } = await useApi<WcaReconFeedItem[]>(`wca/reconstruction/user/${route.params.id}`)
</script>

<template>
  <div class="mt-4">
    <div v-if="!items || items.length === 0" class="text-sm text-gray-400 italic py-4">
      {{ t('wca.recon.noMyRecons') }}
    </div>
    <div v-else>
      <NuxtLink
        v-for="item in items"
        :key="item.id"
        :to="`/wca/reconstruction/${item.wcaCompetitionId}/${userId(user)}`"
        class="border-t first:border-t-0 border-gray-300 pt-2 px-2 mt-2 flex gap-2 items-center hover:bg-gray-50"
      >
        <div class="flex-1 overflow-hidden">
          <div class="text-blue-500 text-ellipsis overflow-hidden whitespace-nowrap font-medium">
            {{ item.competitionName }}
          </div>
          <div class="text-gray-400 text-xs flex items-center gap-2">
            <span>{{ t('wca.recon.submissions', { count: item.submissionCount }) }}</span>
            <span v-if="!item.isParticipant">({{ t('wca.recon.unofficial') }})</span>
          </div>
        </div>
        <div v-if="item.description" class="hidden md:block text-xs text-gray-400 max-w-xs truncate">
          {{ item.description }}
        </div>
        <span class="text-xs text-gray-400 whitespace-nowrap">
          {{ dayjs(item.updatedAt).locale(locale).fromNow() }}
        </span>
        <Icon name="heroicons:chevron-right-16-solid" class="text-gray-300" />
      </NuxtLink>
    </div>
  </div>
</template>
