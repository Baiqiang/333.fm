<script setup lang="ts">
const { data } = await useApi<{
  latest: Practice[]
  mostAttended: Practice[]
}>('/practice')
</script>

<template>
  <HomeCard :title="$t('practice.title')" icon="mdi:notebook-edit-outline" to="/practice">
    <template #actions>
      <NuxtLink to="/practice/new" class="flex items-center gap-0.5 text-blue-500 hover:text-blue-600">
        <Icon name="ic:twotone-plus" />
        {{ $t('common.new') }}
      </NuxtLink>
      <HomeMoreLink to="/practice" />
    </template>
    <div class="grid md:grid-cols-2 gap-x-6 gap-y-4">
      <div>
        <h3 class="text-xs text-gray-400">
          {{ $t('practice.latest') }}
        </h3>
        <PracticeInfo v-for="competition in data?.latest.slice(0, 4)" :key="competition.id" :competition="competition" />
      </div>
      <div>
        <h3 class="text-xs text-gray-400">
          {{ $t('practice.mostAttended') }}
        </h3>
        <PracticeInfo v-for="competition in data?.mostAttended.slice(0, 4)" :key="competition.id" :competition="competition" />
      </div>
    </div>
  </HomeCard>
</template>
