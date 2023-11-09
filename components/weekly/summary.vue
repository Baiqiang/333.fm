<script setup lang="ts">
const props = defineProps<{
  competition: Competition
}>()
const dayjs = useDayjs()
const week = computed(() => dayjs(props.competition.startTime).format('YYYY-ww'))
</script>

<template>
  <div>
    <WeeklyStatus :competition="competition" />
    <div v-for="{ scramble, number } in competition.scrambles" :key="number" class="mt-2">
      <pre class="whitespace-pre-wrap break-all">No.{{ number }} {{ scramble }}</pre>
      <CubeExpanded :moves="scramble" />
    </div>
    <div class="mt-4">
      <NuxtLink :to="`/weekly/${week}`" class="bg-indigo-500 text-white px-3 py-2 text-lg">
        {{ $t('weekly.join') }}
      </NuxtLink>
    </div>
  </div>
</template>
