<script setup lang="ts">
const { t } = useI18n()
const trainingNavs = useTrainingNavs()
const toolNavs = useToolNavs()
const groups = computed(() => [
  { title: t('header.training'), items: trainingNavs.value },
  { title: t('tools.title'), items: toolNavs.value },
])
</script>

<template>
  <HomeCard :title="`${$t('header.training')} · ${$t('tools.title')}`" icon="mdi:toolbox-outline">
    <div class="space-y-4">
      <div v-for="group in groups" :key="group.title">
        <h3 class="text-xs text-gray-400 mb-1.5">
          {{ group.title }}
        </h3>
        <div class="grid grid-cols-2 gap-2">
          <NuxtLink
            v-for="item in group.items"
            :key="item.path"
            :to="item.path"
            class="flex items-center gap-2 px-2 py-2 bg-gray-50 hover:bg-gray-100 text-sm transition"
          >
            <Icon :name="item.icon" size="18" class="text-indigo-500 shrink-0" />
            <span class="truncate">{{ item.title }}</span>
          </NuxtLink>
        </div>
      </div>
    </div>
  </HomeCard>
</template>
