<script setup lang="ts">
const { data: endlesses } = await useApi<Endless[]>('/endless/on-going')
</script>

<template>
  <HomeCard :title="$t('endless.title')" icon="mdi:infinity" to="/endless">
    <template #actions>
      <HomeMoreLink to="/endless" />
    </template>
    <div class="divide-y divide-gray-200">
      <NuxtLink
        v-for="endless in endlesses"
        :key="endless.id"
        :to="competitionPath(endless)"
        class="flex items-center justify-between gap-2 py-2 first:pt-0 text-blue-500 hover:text-blue-600"
      >
        {{ endless.name }}
        <Icon name="ic:round-keyboard-arrow-right" class="text-gray-400 shrink-0" />
      </NuxtLink>
      <NuxtLink to="/chain" class="flex items-center justify-between gap-2 py-2 last:pb-0 text-blue-500 hover:text-blue-600">
        {{ $t('chain.title') }}
        <Icon name="ic:round-keyboard-arrow-right" class="text-gray-400 shrink-0" />
      </NuxtLink>
    </div>
  </HomeCard>
</template>
