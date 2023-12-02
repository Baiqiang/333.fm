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
          <div v-for="r, k in stat" :key="k" class="flex mb-2 gap-1">
            <div>
              {{ r.rank }}.
            </div>
            <UserAvatarName v-if="key === 'singles'" :user="r.user">
              {{ formatResult(r.best) }}
            </UserAvatarName>
            <UserAvatarName v-else :user="r.user">
              {{ formatResult(r.average, 2) }}
            </UserAvatarName>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
