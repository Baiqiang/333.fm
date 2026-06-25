<script setup lang="ts">
const props = defineProps<{
  scramble: Scramble
}>()
const { data } = await useApi<ChainStats>(`/chain/${props.scramble.number}/stats`)
const stats = ref<ChainStats>(data.value!)
</script>

<template>
  <div class="mt-4 mb-4">
    <div class="grid grid-cols-[10rem_10rem_1fr] gap-y-1">
      <div class="grid grid-cols-subgrid col-span-3">
        <div class="font-bold ">
          {{ $t('common.total') }}
        </div>
        <div>
          {{ stats.total }}
        </div>
        <div>
          {{ $t('endless.progress.competitors', { competitors: stats.competitors }) }}
        </div>
      </div>
      <div
        v-for="{ phase, count, competitors } in stats.phaseCount"
        :key="phase"
        class="grid grid-cols-subgrid col-span-3 border-t border-gray-200"
      >
        <NuxtLink class="font-bold text-blue-500" :to="`/chain/${scramble.number}/phase/${SubmissionPhase[phase]}`">
          {{ SubmissionPhase[phase] }}
        </NuxtLink>
        <div>
          {{ count }}
        </div>
        <div>
          {{ $t('endless.progress.competitors', { competitors }) }}
        </div>
      </div>
    </div>
    <ChainTop v-if="stats.top10.length > 0" :submissions="stats.top10" :scramble="scramble" />
  </div>
</template>
