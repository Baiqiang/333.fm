<script setup lang="ts">
const props = defineProps<{
  results: Result[]
}>()
</script>

<template>
  <div>
    <div class="grid grid-cols-[max-content_4rem_2rem_2rem_2rem_2rem_1fr] gap-2">
      <div class="grid grid-cols-subgrid col-span-full font-bold pb-2 border-b border-gray-300">
        <div class="pl-2">
          {{ $t('practice.title') }}
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
      <UserResult v-for="result in results" :key="result.id" :result="result" />
    </div>
  </div>
</template>
