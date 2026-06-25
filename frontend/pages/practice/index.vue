<script setup lang="ts">
const { data } = await useApi<{
  latest: Practice[]
  mostAttended: Practice[]
  mostPractices: User[]
}>('/practice')
const latest = ref(data.value?.latest || [])
const mostAttended = ref(data.value?.mostAttended || [])
const mostPractices = ref(data.value?.mostPractices || [])
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
        <PracticeInfo
          v-for="competition in latest"
          :key="competition.id"
          :competition="competition"
        />
      </div>
      <div class="col-span-12 md:col-span-6 lg:col-span-4">
        <h2 class="my-2 font-bold text-lg">
          {{ $t('practice.mostAttended') }}
        </h2>
        <PracticeInfo
          v-for="competition in mostAttended"
          :key="competition.id"
          :competition="competition"
        />
      </div>
      <div class="col-span-12 md:col-span-6 lg:col-span-4">
        <h2 class="my-2 font-bold text-lg">
          {{ $t('practice.mostPractices') }}
        </h2>
        <NuxtLink
          v-for="user in mostPractices"
          :key="user.id"
          class="flex items-center gap-2 text-blue-500 pt-2"
          :to="`/practice/${userId(user)}`"
        >
          <UserAvatarName :user="user" :link="false" />
          {{ $t('practice.practices', { n: user.practices }) }}
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
