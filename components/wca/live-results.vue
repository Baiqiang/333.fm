<script setup lang="ts">
const props = defineProps<{
  results: WCALiveRoundResult[]
}>()
const format = computed(() => props.results.some(result => result.average > 0) ? 'm' : 'o')
</script>

<template>
  <div>
    <div class="grid grid-cols-[max-content_max-content_4rem_2rem_1fr] gap-x-2">
      <div class="grid grid-cols-subgrid col-span-full font-bold pb-2 border-b border-gray-300">
        <div class="text-right">
          {{ $t('result.rank') }}
        </div>
        <div class="">
          {{ $t('result.name') }}
        </div>
        <div v-if="format === 'm'" class="text-right">
          {{ $t('result.mean') }}
        </div>
        <div class="text-right">
          {{ $t('result.single') }}
        </div>
        <div
          :class="{
            'col-span-2': format !== 'm',
          }"
        >
          {{ $t('result.solves') }}
        </div>
      </div>
      <WcaLiveResult v-for="result in results" :key="result.id" :result="result" :format="format" />
    </div>
  </div>
</template>
