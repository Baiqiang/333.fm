<script setup lang="ts">
const { t } = useI18n()
const { data, error, refresh } = await useApi<LeagueSession[]>('/league/admin/sessions')
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
        Sessions
      </h3>
      <div v-for="session in data" :key="session.id">
        <NuxtLink :to="`/league/admin/session/${session.number}`" class="text-indigo-500">
          {{ session.title }}
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
