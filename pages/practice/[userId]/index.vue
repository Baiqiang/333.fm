<script setup lang="ts">
const profile = inject(SYMBOL_USER)!
const competitions = ref<Practice[]>([])
const { data } = await useApi<Practice[]>(`/practice/${profile.value.id}/competitions`)
competitions.value = data.value || []
</script>

<template>
  <div>
    <NuxtLink to="/practice/new" class="bg-indigo-500 text-white px-3 py-2 mb-2 inline-flex items-center gap-1">
      <Icon name="ic:twotone-plus" />
      {{ $t('common.new') }}
    </NuxtLink>
    <PracticeInfo
      v-for="competition in competitions"
      :key="competition.id"
      :competition="competition"
      class="col-span-12 md:col-span-6 lg:col-span-4"
    />
  </div>
</template>
