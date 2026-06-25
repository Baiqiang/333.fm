<script setup lang="ts">
const profile = inject(SYMBOL_USER)!
const created = ref<Practice[]>([])
const joined = ref<Practice[]>([])
const { data } = await useApi<{
  created: Practice[]
  joined: Practice[]
}>(`/practice/${profile.value.id}/competitions`)
created.value = data.value?.created || []
joined.value = data.value?.joined || []
</script>

<template>
  <div>
    <NuxtLink to="/practice/new" class="bg-indigo-500 text-white px-3 py-2 mb-2 inline-flex items-center gap-1">
      <Icon name="ic:twotone-plus" />
      {{ $t('common.new') }}
    </NuxtLink>
    <div class="grid md:grid-cols-2">
      <div v-if="created.length > 0">
        <div class="font-bold text-lg my-2">
          {{ $t('practice.created') }}
        </div>
        <PracticeInfo
          v-for="competition in created"
          :key="competition.id"
          :competition="competition"
          class="col-span-12 md:col-span-6 lg:col-span-4"
        />
      </div>
      <div v-if="joined.length > 0">
        <div class="font-bold text-lg my-2">
          {{ $t('practice.joined') }}
        </div>
        <PracticeInfo
          v-for="competition in joined"
          :key="competition.id"
          :competition="competition"
          class="col-span-12 md:col-span-6 lg:col-span-4"
        />
      </div>
    </div>
  </div>
</template>
