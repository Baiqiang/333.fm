<script setup lang="ts">
const { t } = useI18n()
const { data, error, refresh } = await useApi<LeagueSeason[]>('/league/admin/seasons')
</script>

<template>
  <div>
    <Heading1>
      League Admin
    </Heading1>
    <NuxtLink to="/league/admin/create" class="bg-indigo-500 text-white px-3 py-2 mb-2 inline-flex items-center gap-1">
      <Icon name="ic:twotone-plus" />
      {{ t('common.new') }}
    </NuxtLink>
    <div>
      <h3 class="text-lg font-bold my-2">
        Seasons
      </h3>
      <div v-for="season in data" :key="season.id">
        <NuxtLink :to="`/league/admin/season/${season.number}`" class="text-indigo-500">
          {{ season.title }}
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
