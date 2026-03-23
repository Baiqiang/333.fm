<script setup lang="ts">
const props = defineProps<{
  results: WCAResult[]
  competitionMeta: Record<string, { index: number, date: string }>
}>()
</script>

<template>
  <div>
    <div class="grid grid-cols-[3rem_max-content_2rem_4rem_max-content_3rem_2rem_2rem_2rem_1fr] gap-2">
      <div class="grid grid-cols-subgrid col-span-full font-bold pb-2 border-b border-gray-300">
        <div class="pl-2">
          {{ $t('result.sequence') }}
        </div>
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
        <div class="">
          {{ $t('result.date') }}
        </div>
      </div>
      <WcaResult v-for="result, index in props.results" :key="result.id" :result="result">
        <template #sequence>
          <div v-if="result.competition_id !== props.results[index - 1]?.competition_id" class="pl-2 font-mono">
            {{ props.competitionMeta[result.competition_id]?.index }}
          </div>
          <div v-else />
        </template>
        <template #competition>
          <NuxtLink
            v-if="result.competition_id !== props.results[index - 1]?.competition_id"
            :to="`/wca/reconstruction/${result.competition_id}`"
            class="pl-2 text-blue-500"
          >
            {{ result.competition_id }}
          </NuxtLink>
          <div v-else />
        </template>
        <template #date>
          <div v-if="result.competition_id !== props.results[index - 1]?.competition_id" class="font-mono text-gray-500">
            {{ props.competitionMeta[result.competition_id]?.date }}
          </div>
          <div v-else />
        </template>
      </WcaResult>
    </div>
  </div>
</template>
