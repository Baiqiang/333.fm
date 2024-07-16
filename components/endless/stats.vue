<script setup lang="ts">
const props = defineProps<{
  endless: Endless
}>()
const user = useUser()
const { data } = await useApi<EndlessStats>(`/endless/${props.endless.alias}/stats`)
const stats = ref<EndlessStats>(data.value!)
</script>

<template>
  <div class="mt-2 mb-4">
    <h3 class="font-bold text-lg my-2">
      {{ $t('endless.stats.title') }}
    </h3>
    <div class="overflow-x-auto">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-2 gap-y-4 whitespace-nowrap">
        <template v-for="stat, key in stats" :key="key">
          <EndlessStatSingles v-if="key === 'singles'" :results="stat" />
          <EndlessStatMeans v-else-if="key === 'means'" :results="stat" />
          <EndlessStatHighestLevels v-else-if="key === 'highestLevels'" :results="stat" />
          <EndlessStatAon v-else-if="key.toString().startsWith('rolling')" :results="stat" :type="key" />
        </template>
      </div>
    </div>
    <EndlessStatPersonal v-if="user.signedIn" :endless="endless" />
  </div>
</template>
