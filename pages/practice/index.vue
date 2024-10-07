<script setup lang="ts">
const { data } = await useApi<{
  latest: Practice[]
  mostAttended: Practice[]
}>('/practice')
const latest = ref(data.value?.latest || [])
const mostAttended = ref(data.value?.mostAttended || [])
const { t } = useI18n()
useSeoMeta({
  title: t('practice.title'),
})
</script>

<template>
  <div class="mt-2">
    <NuxtLink to="/practice/new" class="bg-indigo-500 text-white px-3 py-2 mb-2 inline-flex items-center gap-1">
      <Icon name="ic:twotone-plus" />
      {{ t('common.new') }}
    </NuxtLink>
    <div class="grid grid-cols-12 gap-2">
      <div class="col-span-12 md:col-span-6 lg:col-span-4">
        <h2 class="my-2 font-bold text-lg">
          {{ $t('practice.latest') }}
        </h2>
        <div>
          <PracticeInfo
            v-for="competition in latest"
            :key="competition.id"
            :competition="competition"
          />
        </div>
      </div>
      <div class="col-span-12 md:col-span-6 lg:col-span-4">
        <h2 class="my-2 font-bold text-lg">
          {{ $t('practice.mostAttended') }}
        </h2>
        <div>
          <PracticeInfo
            v-for="competition in mostAttended"
            :key="competition.id"
            :competition="competition"
          />
        </div>
      </div>
    </div>
  </div>
</template>
