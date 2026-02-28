<script setup lang="ts">
const props = defineProps<{
  results: WCAResult[]
}>()
const sortedResults = computed(() => props.results.slice().reverse())
</script>

<template>
  <div>
    <div class="grid grid-cols-[max-content_2rem_4rem_max-content_2rem_2rem_2rem_1fr] gap-2">
      <div class="grid grid-cols-subgrid col-span-full font-bold pb-2 border-b border-gray-300">
        <div class="pl-2">
          {{ $t('result.competition') }}
        </div>
        <div class="text-right">
          {{ $t('result.round') }}
        </div>
        <div class="text-right">
          {{ $t('result.rank') }}
        </div>
        <div class="text-right">
          {{ $t('result.mean') }}
        </div>
        <div class="text-right">
          {{ $t('result.single') }}
        </div>
        <div class="col-span-3">
          {{ $t('result.solves') }}
        </div>
      </div>
      <WcaResult v-for="result, index in sortedResults" :key="result.id" :result="result">
        <template #competition>
          <NuxtLink
            v-if="result.competition_id !== sortedResults[index - 1]?.competition_id"
            :to="`/wca/reconstruction/${result.competition_id}`"
            class="pl-2 text-blue-500"
          >
            {{ result.competition_id }}
          </NuxtLink>
          <div v-else />
        </template>
      </WcaResult>
    </div>
  </div>
</template>
