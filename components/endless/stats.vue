<script setup lang="ts">
const props = defineProps<{
  endless: Endless
}>()
const { data } = await useApi<EndlessStats>(`/endless/${props.endless.alias}/stats`)
const stats = ref<EndlessStats>(data.value!)
</script>

<template>
  <div class="mt-2 mb-4">
    <h3 class="font-bold text-lg my-2">
      {{ $t('endless.stats.title') }}
    </h3>
    <div class="overflow-x-auto">
      <div class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-2 whitespace-nowrap">
        <div v-for="stat, key in stats" :key="key">
          <h4 class="font-bold mb-2">
            {{ $t(`endless.stats.${key}`) }}
          </h4>
          <div class="grid grid-cols-[1.5rem_max-content_1fr] gap-2">
            <template v-for="r, k in stat" :key="k">
              <div class="font-mono text-right">
                {{ r.rank }}
              </div>
              <UserAvatarName :user="r.user" />
              <div>
                {{ key === 'singles' ? formatResult(r.best) : formatResult(r.average, 2) }}
              </div>
            </template>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
